import { buildJsonRequestInit, readJsonOrThrow, type ApiFetch } from './api';
import { normalizeSearchQuery } from './items';
import {
  buildQueryString,
  isNullableNumber,
  isNullableString,
  isNumber,
  isObject,
  isString,
  matchEnum,
  normalizeImageUrl,
  parseArray,
  parsePagination,
  parseUserSummary,
  type Pagination,
  type QueryParam,
  type UserSummary,
} from './parse';

export type FetchHasCirclesOptions = {
  signal?: AbortSignal;
};

// A user in no circles gets an empty items page rather than an error, and that
// is indistinguishable from "no search results" — hence this separate probe.
// Circles are modelled below; this probe stays because callers only need a
// boolean and a cheap query for it.
const HAS_CIRCLES_PATH = '/circles?membership=mine&per_page=1';

export async function fetchHasCircles(
  fetchImpl: ApiFetch,
  options?: FetchHasCirclesOptions,
): Promise<boolean> {
  const response = await fetchImpl(HAS_CIRCLES_PATH, {
    signal: options?.signal,
  });
  const payload = await readJsonOrThrow<unknown>(response);

  if (!isObject(payload)) {
    throw new Error('Invalid circles payload.');
  }

  return parsePagination(payload.pagination).total > 0;
}

export const CIRCLE_TYPES = ['open', 'closed', 'secret'] as const;

export type CircleType = (typeof CIRCLE_TYPES)[number];

export const CIRCLE_MEMBERSHIPS = ['mine', 'discoverable'] as const;

export type CircleMembership = (typeof CIRCLE_MEMBERSHIPS)[number];

export type CircleSummary = {
  id: string;
  name: string;
  description: string | null;
  /** `null` when the server reports a type this client does not know. */
  circle_type: CircleType | null;
  is_regional: boolean;
  regional_radius_miles: number | null;
  created_at: string;
  image_url: string | null;
  requires_join_approval: boolean;
  member_count: number;
  is_member: boolean;
  is_admin: boolean;
  has_pending_join_request: boolean;
  /** Admin-only meaning; 0 for a non-admin viewer. */
  pending_join_request_count: number;
  /** Rounded to 2dp by the server; `null` when either side is not geocoded. */
  distance_miles: number | null;
};

export type CircleMember = {
  user: UserSummary;
  joined_at: string;
  is_admin: boolean;
};

export type PendingJoinRequest = {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
};

export type CircleDetail = CircleSummary & {
  can_view_members: boolean;
  is_last_member: boolean;
  pending_join_request: PendingJoinRequest | null;
  members: CircleMember[];
  members_total: number;
  members_page: number;
  members_pages: number;
};

export type CirclePage = {
  circles: CircleSummary[];
  pagination: Pagination;
};

export type CircleDetailResponse = {
  circle: CircleDetail;
};

export type JoinCircleResponse = {
  membership_status: 'member' | 'pending';
  join_request: PendingJoinRequest | null;
};

export type FetchCirclesOptions = {
  membership: CircleMembership;
  q?: string;
  page: number;
  /** The backend rejects `per_page` above 50 with a 422; it does not clamp. */
  perPage?: number;
  signal?: AbortSignal;
};

export type FetchCircleDetailOptions = {
  membersPage?: number;
  signal?: AbortSignal;
};

export type JoinCircleOptions = {
  message?: string;
};

const INVALID_CIRCLE = 'Invalid circle payload.';
const INVALID_CIRCLES = 'Invalid circles payload.';
const INVALID_CIRCLE_DETAIL = 'Invalid circle detail payload.';
const INVALID_JOIN_RESPONSE = 'Invalid join circle payload.';
const INVALID_CANCEL_RESPONSE = 'Invalid cancel join request payload.';

export function parseCircleSummary(value: unknown): CircleSummary {
  if (!isObject(value)) {
    throw new Error(INVALID_CIRCLE);
  }

  const {
    circle_type: circleType,
    created_at: createdAt,
    description,
    distance_miles: distanceMiles,
    has_pending_join_request: hasPendingJoinRequest,
    id,
    image_url: imageUrl,
    is_admin: isAdmin,
    is_member: isMember,
    is_regional: isRegional,
    member_count: memberCount,
    name,
    pending_join_request_count: pendingJoinRequestCount,
    regional_radius_miles: regionalRadiusMiles,
    requires_join_approval: requiresJoinApproval,
  } = value;

  if (
    !isString(id) ||
    !isString(name) ||
    !isString(createdAt) ||
    !isNullableString(description) ||
    !isNullableString(circleType) ||
    typeof isRegional !== 'boolean' ||
    !isNullableNumber(regionalRadiusMiles) ||
    !isNullableString(imageUrl) ||
    typeof requiresJoinApproval !== 'boolean' ||
    !isNumber(memberCount) ||
    typeof isMember !== 'boolean' ||
    typeof isAdmin !== 'boolean' ||
    typeof hasPendingJoinRequest !== 'boolean' ||
    !isNumber(pendingJoinRequestCount) ||
    !isNullableNumber(distanceMiles)
  ) {
    throw new Error(INVALID_CIRCLE);
  }

  return {
    id,
    name,
    description: description ?? null,
    circle_type: matchEnum(circleType, CIRCLE_TYPES),
    is_regional: isRegional,
    regional_radius_miles: regionalRadiusMiles ?? null,
    created_at: createdAt,
    image_url: normalizeImageUrl(imageUrl),
    requires_join_approval: requiresJoinApproval,
    member_count: memberCount,
    is_member: isMember,
    is_admin: isAdmin,
    has_pending_join_request: hasPendingJoinRequest,
    pending_join_request_count: pendingJoinRequestCount,
    distance_miles: distanceMiles ?? null,
  };
}

function parsePendingJoinRequest(value: unknown): PendingJoinRequest {
  if (!isObject(value)) {
    throw new Error(INVALID_CIRCLE_DETAIL);
  }

  const { created_at: createdAt, id, message, status } = value;

  if (
    !isString(id) ||
    !isNullableString(message) ||
    !isString(status) ||
    !isString(createdAt)
  ) {
    throw new Error(INVALID_CIRCLE_DETAIL);
  }

  return {
    id,
    message: message ?? null,
    status,
    created_at: createdAt,
  };
}

function parseCircleMember(value: unknown): CircleMember {
  if (!isObject(value)) {
    throw new Error(INVALID_CIRCLE_DETAIL);
  }

  const { is_admin: isAdmin, joined_at: joinedAt, user } = value;

  if (typeof isAdmin !== 'boolean' || !isString(joinedAt)) {
    throw new Error(INVALID_CIRCLE_DETAIL);
  }

  return {
    user: parseUserSummary(user, INVALID_CIRCLE_DETAIL),
    joined_at: joinedAt,
    is_admin: isAdmin,
  };
}

export function parseCircleDetail(value: unknown): CircleDetail {
  if (!isObject(value)) {
    throw new Error(INVALID_CIRCLE_DETAIL);
  }

  const summary = parseCircleSummary(value);
  const {
    can_view_members: canViewMembers,
    is_last_member: isLastMember,
    members,
    members_page: membersPage,
    members_pages: membersPages,
    members_total: membersTotal,
    pending_join_request: pendingJoinRequest,
  } = value;

  if (
    typeof canViewMembers !== 'boolean' ||
    typeof isLastMember !== 'boolean' ||
    !isNumber(membersTotal) ||
    !isNumber(membersPage) ||
    !isNumber(membersPages)
  ) {
    throw new Error(INVALID_CIRCLE_DETAIL);
  }

  return {
    ...summary,
    can_view_members: canViewMembers,
    is_last_member: isLastMember,
    pending_join_request:
      pendingJoinRequest === null || pendingJoinRequest === undefined
        ? null
        : parsePendingJoinRequest(pendingJoinRequest),
    members: parseArray(members, INVALID_CIRCLE_DETAIL).map(parseCircleMember),
    members_total: membersTotal,
    members_page: membersPage,
    members_pages: membersPages,
  };
}

export function parseCirclePage(value: unknown): CirclePage {
  if (!isObject(value)) {
    throw new Error(INVALID_CIRCLES);
  }

  return {
    circles: parseArray(value.circles, INVALID_CIRCLES).map(parseCircleSummary),
    pagination: parsePagination(value.pagination),
  };
}

export function parseCircleDetailResponse(
  value: unknown,
): CircleDetailResponse {
  if (!isObject(value)) {
    throw new Error(INVALID_CIRCLE_DETAIL);
  }

  return {
    circle: parseCircleDetail(value.circle),
  };
}

export function parseJoinCircleResponse(value: unknown): JoinCircleResponse {
  if (!isObject(value)) {
    throw new Error(INVALID_JOIN_RESPONSE);
  }

  const { join_request: joinRequest, membership_status: membershipStatus } =
    value;

  if (
    (membershipStatus !== 'member' && membershipStatus !== 'pending') ||
    (joinRequest !== null &&
      joinRequest !== undefined &&
      !isObject(joinRequest))
  ) {
    throw new Error(INVALID_JOIN_RESPONSE);
  }

  return {
    membership_status: membershipStatus,
    join_request:
      joinRequest === null || joinRequest === undefined
        ? null
        : parsePendingJoinRequest(joinRequest),
  };
}

export async function fetchCircles(
  fetchImpl: ApiFetch,
  options: FetchCirclesOptions,
): Promise<CirclePage> {
  const params: QueryParam[] = [
    ['membership', options.membership],
    ['page', String(options.page)],
  ];
  const searchQuery = normalizeSearchQuery(options.q);

  if (searchQuery) {
    params.push(['q', searchQuery]);
  }

  if (options.perPage !== undefined) {
    params.push(['per_page', String(options.perPage)]);
  }

  const response = await fetchImpl(`/circles${buildQueryString(params)}`, {
    signal: options.signal,
  });

  return parseCirclePage(await readJsonOrThrow<unknown>(response));
}

export async function fetchCircleDetail(
  fetchImpl: ApiFetch,
  id: string,
  options?: FetchCircleDetailOptions,
): Promise<CircleDetailResponse> {
  // Page 1 is the backend default, so the first request keeps a bare path.
  const params: QueryParam[] =
    options?.membersPage !== undefined && options.membersPage > 1
      ? [['members_page', String(options.membersPage)]]
      : [];
  const response = await fetchImpl(
    `/circles/${encodeURIComponent(id)}${buildQueryString(params)}`,
    { signal: options?.signal },
  );

  return parseCircleDetailResponse(await readJsonOrThrow<unknown>(response));
}

export async function joinCircle(
  fetchImpl: ApiFetch,
  id: string,
  options?: JoinCircleOptions,
): Promise<JoinCircleResponse> {
  const body = options?.message ? { message: options.message } : {};
  const response = await fetchImpl(
    `/circles/${encodeURIComponent(id)}/join`,
    buildJsonRequestInit(body, { method: 'POST' }),
  );

  return parseJoinCircleResponse(await readJsonOrThrow<unknown>(response));
}

export async function cancelJoinRequest(
  fetchImpl: ApiFetch,
  id: string,
): Promise<{ canceled: boolean }> {
  const response = await fetchImpl(
    `/circles/${encodeURIComponent(id)}/cancel-request`,
    { method: 'POST' },
  );
  const payload = await readJsonOrThrow<unknown>(response);

  if (!isObject(payload) || typeof payload.canceled !== 'boolean') {
    throw new Error(INVALID_CANCEL_RESPONSE);
  }

  return { canceled: payload.canceled };
}
