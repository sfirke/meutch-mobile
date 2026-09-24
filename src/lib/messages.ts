import { buildJsonRequestInit, readJsonOrThrow, type ApiFetch } from './api';
import {
  buildQueryString,
  isNullableString,
  isNumber,
  isObject,
  isString,
  normalizeImageUrl,
  parseArray,
  parseLoanSummary,
  parsePagination,
  parseUserSummary,
  type LoanSummary,
  type Pagination,
  type QueryParam,
  type UserSummary,
} from './parse';

export const INBOX_STATUSES = ['inbox', 'archived'] as const;

export type InboxStatus = (typeof INBOX_STATUSES)[number];

export type MessageSummary = {
  id: string;
  body: string;
  /** ISO datetime, unlike a loan's `YYYY-MM-DD` dates. */
  timestamp: string;
  is_read: boolean;
  sender: UserSummary;
  recipient: UserSummary;
};

export type ConversationItemContext = {
  id: string;
  name: string;
  image_url: string | null;
};

export type ConversationRequestContext = {
  id: string;
  title: string;
  status: string;
  visibility: string;
  expires_at: string | null;
};

export type ConversationCircleContext = {
  id: string;
  name: string;
  /** Free-form here: the messaging context schema does not constrain it. */
  circle_type: string;
  image_url: string | null;
};

/**
 * A conversation hangs off exactly one subject, which the backend sends as one
 * of three mutually exclusive keys (the others null or absent).
 */
export type ConversationContext =
  | { kind: 'item'; item: ConversationItemContext }
  | { kind: 'request'; request: ConversationRequestContext }
  | { kind: 'circle'; circle: ConversationCircleContext }
  | { kind: 'none' };

export type ConversationSummary = {
  conversation_id: string;
  /** `null` when the other participant's account has been deleted. */
  other_user: UserSummary | null;
  latest_message: MessageSummary;
  unread_count: number;
  is_archived: boolean;
  context: ConversationContext;
};

export type MessageThread = {
  conversation_id: string;
  /** Never null: the thread route 404s when the other account is gone. */
  other_user: UserSummary;
  shared_circles: ConversationCircleContext[];
  context: ConversationContext;
  active_loan: LoanSummary | null;
  /**
   * Excludes messages tied to a pending loan request, while the inbox's
   * `unread_count` includes them, so a row can still read as unread after the
   * thread is opened and marked read. This mirrors the web app.
   */
  has_unread_messages: boolean;
  /** Ascending by timestamp. */
  messages: MessageSummary[];
};

export type ConversationPage = {
  conversations: ConversationSummary[];
  pagination: Pagination;
};

export type MarkThreadReadResponse = {
  has_unread_messages: boolean;
};

export type FetchConversationsOptions = {
  status: InboxStatus;
  page: number;
  /** The backend rejects `per_page` above 50 with a 422; it does not clamp. */
  perPage?: number;
  signal?: AbortSignal;
};

export type FetchMessageThreadOptions = {
  signal?: AbortSignal;
};

const INVALID_MESSAGE = 'Invalid message payload.';
const INVALID_CONVERSATION = 'Invalid conversation payload.';
const INVALID_CONVERSATIONS = 'Invalid conversations payload.';
const INVALID_THREAD = 'Invalid conversation thread payload.';
const INVALID_REPLY = 'Invalid reply payload.';
const INVALID_MARK_READ = 'Invalid mark-read payload.';

export function parseMessageSummary(value: unknown): MessageSummary {
  if (!isObject(value)) {
    throw new Error(INVALID_MESSAGE);
  }

  const { body, id, is_read: isRead, recipient, sender, timestamp } = value;

  if (
    !isString(id) ||
    !isString(body) ||
    !isString(timestamp) ||
    typeof isRead !== 'boolean'
  ) {
    throw new Error(INVALID_MESSAGE);
  }

  return {
    id,
    body,
    timestamp,
    is_read: isRead,
    sender: parseUserSummary(sender, INVALID_MESSAGE),
    recipient: parseUserSummary(recipient, INVALID_MESSAGE),
  };
}

function parseItemContext(
  value: unknown,
  message: string,
): ConversationItemContext {
  if (!isObject(value)) {
    throw new Error(message);
  }

  const { id, image_url: imageUrl, name } = value;

  if (!isString(id) || !isString(name) || !isNullableString(imageUrl)) {
    throw new Error(message);
  }

  return { id, name, image_url: normalizeImageUrl(imageUrl) };
}

function parseRequestContext(
  value: unknown,
  message: string,
): ConversationRequestContext {
  if (!isObject(value)) {
    throw new Error(message);
  }

  const { expires_at: expiresAt, id, status, title, visibility } = value;

  if (
    !isString(id) ||
    !isString(title) ||
    !isString(status) ||
    !isString(visibility) ||
    !isNullableString(expiresAt)
  ) {
    throw new Error(message);
  }

  return { id, title, status, visibility, expires_at: expiresAt ?? null };
}

export function parseCircleContext(
  value: unknown,
  message: string,
): ConversationCircleContext {
  if (!isObject(value)) {
    throw new Error(message);
  }

  const { circle_type: circleType, id, image_url: imageUrl, name } = value;

  if (
    !isString(id) ||
    !isString(name) ||
    !isString(circleType) ||
    !isNullableString(imageUrl)
  ) {
    throw new Error(message);
  }

  return {
    id,
    name,
    circle_type: circleType,
    image_url: normalizeImageUrl(imageUrl),
  };
}

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined;
}

/** Reads the one context key the backend set; absent and null are the same. */
function parseConversationContext(
  value: Record<string, unknown>,
  message: string,
): ConversationContext {
  const { circle, item, item_request: itemRequest } = value;

  if (isPresent(item)) {
    return { kind: 'item', item: parseItemContext(item, message) };
  }

  if (isPresent(itemRequest)) {
    return {
      kind: 'request',
      request: parseRequestContext(itemRequest, message),
    };
  }

  if (isPresent(circle)) {
    return { kind: 'circle', circle: parseCircleContext(circle, message) };
  }

  return { kind: 'none' };
}

export function parseConversationSummary(value: unknown): ConversationSummary {
  if (!isObject(value)) {
    throw new Error(INVALID_CONVERSATION);
  }

  const {
    conversation_id: conversationId,
    is_archived: isArchived,
    latest_message: latestMessage,
    other_user: otherUser,
    unread_count: unreadCount,
  } = value;

  // `is_archived` is a nullable column with no server default, so older
  // participant rows send null; the backend treats those as not archived.
  if (
    !isString(conversationId) ||
    !isNumber(unreadCount) ||
    !(typeof isArchived === 'boolean' || isArchived === null)
  ) {
    throw new Error(INVALID_CONVERSATION);
  }

  return {
    conversation_id: conversationId,
    other_user: isPresent(otherUser)
      ? parseUserSummary(otherUser, INVALID_CONVERSATION)
      : null,
    latest_message: parseMessageSummary(latestMessage),
    unread_count: unreadCount,
    is_archived: isArchived ?? false,
    context: parseConversationContext(value, INVALID_CONVERSATION),
  };
}

export function parseConversationPage(value: unknown): ConversationPage {
  if (!isObject(value)) {
    throw new Error(INVALID_CONVERSATIONS);
  }

  return {
    conversations: parseArray(value.conversations, INVALID_CONVERSATIONS).map(
      parseConversationSummary,
    ),
    pagination: parsePagination(value.pagination),
  };
}

export function parseMessageThread(value: unknown): MessageThread {
  if (!isObject(value)) {
    throw new Error(INVALID_THREAD);
  }

  const {
    active_loan: activeLoan,
    conversation_id: conversationId,
    has_unread_messages: hasUnreadMessages,
    messages,
    other_user: otherUser,
    shared_circles: sharedCircles,
  } = value;

  if (!isString(conversationId) || typeof hasUnreadMessages !== 'boolean') {
    throw new Error(INVALID_THREAD);
  }

  return {
    conversation_id: conversationId,
    other_user: parseUserSummary(otherUser, INVALID_THREAD),
    shared_circles: parseArray(sharedCircles, INVALID_THREAD).map((circle) =>
      parseCircleContext(circle, INVALID_THREAD),
    ),
    context: parseConversationContext(value, INVALID_THREAD),
    active_loan: isPresent(activeLoan)
      ? parseLoanSummary(activeLoan, INVALID_THREAD)
      : null,
    has_unread_messages: hasUnreadMessages,
    messages: parseArray(messages, INVALID_THREAD).map(parseMessageSummary),
  };
}

export function parseReplyResponse(value: unknown): MessageSummary {
  if (!isObject(value)) {
    throw new Error(INVALID_REPLY);
  }

  return parseMessageSummary(value.message);
}

export function parseMarkThreadReadResponse(
  value: unknown,
): MarkThreadReadResponse {
  if (!isObject(value) || typeof value.has_unread_messages !== 'boolean') {
    throw new Error(INVALID_MARK_READ);
  }

  return { has_unread_messages: value.has_unread_messages };
}

export async function fetchConversations(
  fetchImpl: ApiFetch,
  options: FetchConversationsOptions,
): Promise<ConversationPage> {
  const params: QueryParam[] = [
    ['status', options.status],
    ['page', String(options.page)],
  ];

  if (options.perPage !== undefined) {
    params.push(['per_page', String(options.perPage)]);
  }

  const response = await fetchImpl(`/messages${buildQueryString(params)}`, {
    signal: options.signal,
  });

  return parseConversationPage(await readJsonOrThrow<unknown>(response));
}

/**
 * The thread route is keyed by a message id, not a conversation id: any message
 * in the conversation resolves to the same thread, so callers pass the inbox
 * row's `latest_message.id`.
 */
export async function fetchMessageThread(
  fetchImpl: ApiFetch,
  messageId: string,
  options?: FetchMessageThreadOptions,
): Promise<MessageThread> {
  const response = await fetchImpl(
    `/messages/${encodeURIComponent(messageId)}`,
    { signal: options?.signal },
  );

  return parseMessageThread(await readJsonOrThrow<unknown>(response));
}

/** The recipient is derived server-side from the anchor message. */
export async function replyToMessage(
  fetchImpl: ApiFetch,
  messageId: string,
  body: string,
): Promise<MessageSummary> {
  const response = await fetchImpl(
    `/messages/${encodeURIComponent(messageId)}/reply`,
    buildJsonRequestInit({ body }, { method: 'POST' }),
  );

  return parseReplyResponse(await readJsonOrThrow<unknown>(response));
}

export async function markThreadRead(
  fetchImpl: ApiFetch,
  messageId: string,
): Promise<MarkThreadReadResponse> {
  const response = await fetchImpl(
    `/messages/${encodeURIComponent(messageId)}/mark-read`,
    { method: 'POST' },
  );

  return parseMarkThreadReadResponse(await readJsonOrThrow<unknown>(response));
}
