import { readJsonOrThrow, type ApiFetch } from './api';
import { ITEM_CLAIM_STATUSES, type ItemClaimStatus } from './items';
import {
  buildQueryString,
  isNullableNumber,
  isNullableString,
  isObject,
  isString,
  normalizeImageUrl,
  parseArray,
  parsePagination,
  type Pagination,
  type QueryParam,
} from './parse';

// The event types the backend emits are singular; the `types` query filter
// takes a different, plural vocabulary. The two sets are not interchangeable.
export const FEED_EVENT_TYPES = [
  'request',
  'giveaway',
  'lent',
  'circle_join',
] as const;

export type FeedEventType = (typeof FEED_EVENT_TYPES)[number];

export const FEED_TYPE_FILTERS = [
  'requests',
  'giveaways',
  'loans',
  'circle_joins',
] as const;

export type FeedTypeFilter = (typeof FEED_TYPE_FILTERS)[number];

export type FeedEvent = {
  event_type: FeedEventType;
  created_at: string;
  title: string;
  description: string | null;
  /** A human phrase already rendered by the backend ("posted a giveaway"). */
  action: string;
  actor_name: string;
  actor_avatar_url: string | null;
  actor_id: string | null;
  actor_profile_viewable: boolean;
  image_url: string | null;
  /** A coarse bucket ("< 1 mi"). Deliberately imprecise: never parse or sort by it. */
  distance: string | null;
  item_id: string | null;
  request_id: string | null;
  loan_request_id: string | null;
  circle_id: string | null;
  user_id: string | null;
  status: string | null;
  claim_status: ItemClaimStatus | null;
  extra_circle_count: number | null;
};

export type FeedPage = {
  events: FeedEvent[];
  pagination: Pagination;
};

export type FetchFeedOptions = {
  page: number;
  /** The backend rejects `per_page` above 50 with a 422; it does not clamp. */
  perPage?: number;
  types?: FeedTypeFilter[];
  signal?: AbortSignal;
};

const INVALID_FEED_EVENT = 'Invalid feed event payload.';
const INVALID_FEED = 'Invalid feed payload.';

function isFeedEventType(value: string): value is FeedEventType {
  return FEED_EVENT_TYPES.includes(value as FeedEventType);
}

/**
 * Returns `null` for an event type this client does not know, so a type added
 * to the independently released backend drops one event instead of the page.
 */
function parseFeedEvent(value: unknown): FeedEvent | null {
  if (!isObject(value)) {
    throw new Error(INVALID_FEED_EVENT);
  }

  const {
    action,
    actor_avatar_url: actorAvatarUrl,
    actor_id: actorId,
    actor_name: actorName,
    actor_profile_viewable: actorProfileViewable,
    circle_id: circleId,
    claim_status: claimStatus,
    created_at: createdAt,
    description,
    distance,
    event_type: eventType,
    extra_circle_count: extraCircleCount,
    image_url: imageUrl,
    item_id: itemId,
    loan_request_id: loanRequestId,
    request_id: requestId,
    status,
    title,
    user_id: userId,
  } = value;

  if (
    !isString(eventType) ||
    !isString(createdAt) ||
    !isString(title) ||
    !isString(action) ||
    !isString(actorName) ||
    typeof actorProfileViewable !== 'boolean' ||
    !isNullableString(description) ||
    !isNullableString(actorAvatarUrl) ||
    !isNullableString(actorId) ||
    !isNullableString(imageUrl) ||
    !isNullableString(distance) ||
    !isNullableString(itemId) ||
    !isNullableString(requestId) ||
    !isNullableString(loanRequestId) ||
    !isNullableString(circleId) ||
    !isNullableString(userId) ||
    !isNullableString(status) ||
    !isNullableString(claimStatus) ||
    !isNullableNumber(extraCircleCount)
  ) {
    throw new Error(INVALID_FEED_EVENT);
  }

  if (!isFeedEventType(eventType)) {
    return null;
  }

  return {
    event_type: eventType,
    created_at: createdAt,
    title,
    description: description ?? null,
    action,
    actor_name: actorName,
    actor_avatar_url: normalizeImageUrl(actorAvatarUrl),
    actor_id: actorId ?? null,
    actor_profile_viewable: actorProfileViewable,
    image_url: normalizeImageUrl(imageUrl),
    distance: distance ?? null,
    item_id: itemId ?? null,
    request_id: requestId ?? null,
    loan_request_id: loanRequestId ?? null,
    circle_id: circleId ?? null,
    user_id: userId ?? null,
    status: status ?? null,
    claim_status:
      typeof claimStatus === 'string' &&
      ITEM_CLAIM_STATUSES.includes(claimStatus as ItemClaimStatus)
        ? (claimStatus as ItemClaimStatus)
        : null,
    extra_circle_count: extraCircleCount ?? null,
  };
}

export function parseFeedPage(value: unknown): FeedPage {
  if (!isObject(value)) {
    throw new Error(INVALID_FEED);
  }

  const events: FeedEvent[] = [];

  for (const rawEvent of parseArray(value.events, INVALID_FEED)) {
    const event = parseFeedEvent(rawEvent);

    if (event) {
      events.push(event);
    }
  }

  return { events, pagination: parsePagination(value.pagination) };
}

export async function fetchFeed(
  fetchImpl: ApiFetch,
  options: FetchFeedOptions,
): Promise<FeedPage> {
  const params: QueryParam[] = [['page', String(options.page)]];

  if (options.perPage !== undefined) {
    params.push(['per_page', String(options.perPage)]);
  }

  // The backend reads list-valued query params from repeated keys.
  for (const type of options.types ?? []) {
    params.push(['types', type]);
  }

  const response = await fetchImpl(`/feed${buildQueryString(params)}`, {
    signal: options.signal,
  });

  return parseFeedPage(await readJsonOrThrow<unknown>(response));
}
