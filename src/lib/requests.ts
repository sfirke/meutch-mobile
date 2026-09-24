import { readJsonOrThrow, type ApiFetch } from './api';
import { formatCalendarDate } from './dates';
import {
  isNullableString,
  isObject,
  isString,
  matchEnum,
  parseArray,
  parseUserSummary,
  type UserSummary,
} from './parse';

/** Deleted requests 404, so the API only ever sends these two. */
export const REQUEST_STATUSES = ['open', 'fulfilled'] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_SEEKING = ['loan', 'giveaway', 'either'] as const;

export type RequestSeeking = (typeof REQUEST_SEEKING)[number];

export const REQUEST_VISIBILITIES = ['circles', 'public'] as const;

export type RequestVisibility = (typeof REQUEST_VISIBILITIES)[number];

export type RequestSummary = {
  id: string;
  title: string;
  description: string | null;
  seeking: RequestSeeking | null;
  visibility: RequestVisibility | null;
  status: RequestStatus | null;
  /** ISO datetime; only its leading calendar date is meaningful. */
  expires_at: string;
  fulfilled_at: string | null;
  created_at: string;
  user: UserSummary;
  /** A coarse bucket like the feed's; render verbatim. */
  distance: string | null;
};

/** One conversation about the request; the API sends these to the owner only. */
export type RequestConversation = {
  other_user: UserSummary;
  latest_message: {
    id: string;
    body: string;
    timestamp: string;
    is_read: boolean;
  };
};

export type RequestDetailResponse = {
  request: RequestSummary;
  conversations: RequestConversation[];
};

export type FetchRequestDetailOptions = {
  signal?: AbortSignal;
};

const INVALID_REQUEST = 'Invalid request payload.';
const INVALID_REQUEST_DETAIL = 'Invalid request detail payload.';

const LEADING_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

function leadingDate(value: string): string | null {
  return LEADING_DATE_PATTERN.exec(value)?.[0] ?? null;
}

/**
 * Mirrors the backend's `ItemRequest.is_expired`: a request stays open through
 * its whole expiration day, compared as UTC calendar dates.
 */
export function isRequestExpired(request: RequestSummary, now: Date): boolean {
  const expiresOn = leadingDate(request.expires_at);

  return expiresOn !== null && now.toISOString().slice(0, 10) > expiresOn;
}

/** Formats the leading date of `expires_at` or `fulfilled_at` as `Jun 3, 2026`. */
export function formatRequestDate(value: string): string | null {
  const date = leadingDate(value);

  return date ? formatCalendarDate(date) : null;
}

export function parseRequestSummary(value: unknown): RequestSummary {
  if (!isObject(value)) {
    throw new Error(INVALID_REQUEST);
  }

  const {
    created_at: createdAt,
    description,
    distance,
    expires_at: expiresAt,
    fulfilled_at: fulfilledAt,
    id,
    seeking,
    status,
    title,
    user,
    visibility,
  } = value;

  if (
    !isString(id) ||
    !isString(title) ||
    !isString(expiresAt) ||
    !isString(createdAt) ||
    !isNullableString(description) ||
    !isNullableString(fulfilledAt) ||
    !isNullableString(distance) ||
    !isNullableString(seeking) ||
    !isNullableString(visibility) ||
    !isNullableString(status)
  ) {
    throw new Error(INVALID_REQUEST);
  }

  return {
    id,
    title,
    description: description ?? null,
    seeking: matchEnum(seeking, REQUEST_SEEKING),
    visibility: matchEnum(visibility, REQUEST_VISIBILITIES),
    status: matchEnum(status, REQUEST_STATUSES),
    expires_at: expiresAt,
    fulfilled_at: fulfilledAt ?? null,
    created_at: createdAt,
    user: parseUserSummary(user, INVALID_REQUEST),
    distance: distance ?? null,
  };
}

function parseRequestConversation(value: unknown): RequestConversation {
  if (!isObject(value) || !isObject(value.latest_message)) {
    throw new Error(INVALID_REQUEST_DETAIL);
  }

  const { body, id, is_read: isRead, timestamp } = value.latest_message;

  if (
    !isString(id) ||
    typeof body !== 'string' ||
    !isString(timestamp) ||
    typeof isRead !== 'boolean'
  ) {
    throw new Error(INVALID_REQUEST_DETAIL);
  }

  return {
    other_user: parseUserSummary(value.other_user, INVALID_REQUEST_DETAIL),
    latest_message: { id, body, timestamp, is_read: isRead },
  };
}

export function parseRequestDetailResponse(
  value: unknown,
): RequestDetailResponse {
  if (!isObject(value)) {
    throw new Error(INVALID_REQUEST_DETAIL);
  }

  return {
    request: parseRequestSummary(value.request),
    conversations: parseArray(value.conversations, INVALID_REQUEST_DETAIL).map(
      parseRequestConversation,
    ),
  };
}

export async function fetchRequestDetail(
  fetchImpl: ApiFetch,
  id: string,
  options?: FetchRequestDetailOptions,
): Promise<RequestDetailResponse> {
  const response = await fetchImpl(`/requests/${encodeURIComponent(id)}`, {
    signal: options?.signal,
  });

  return parseRequestDetailResponse(await readJsonOrThrow<unknown>(response));
}
