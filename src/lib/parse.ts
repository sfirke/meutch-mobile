/** Shared runtime guards and helpers for the read-side API modules. */

export type QueryParam = [string, string];

export type Pagination = {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
};

// Mirrors the unexported guards in session.ts, which must not be edited.
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isNullableString(
  value: unknown,
): value is string | null | undefined {
  return value === null || value === undefined || typeof value === 'string';
}

export function isNullableNumber(
  value: unknown,
): value is number | null | undefined {
  return value === null || value === undefined || isNumber(value);
}

export function parsePagination(value: unknown): Pagination {
  if (!isObject(value)) {
    throw new Error('Invalid pagination payload.');
  }

  const {
    has_next: hasNext,
    has_prev: hasPrev,
    page,
    pages,
    per_page: perPage,
    total,
  } = value;

  if (
    !isNumber(page) ||
    !isNumber(perPage) ||
    !isNumber(total) ||
    !isNumber(pages) ||
    typeof hasNext !== 'boolean' ||
    typeof hasPrev !== 'boolean'
  ) {
    throw new Error('Invalid pagination payload.');
  }

  return {
    page,
    per_page: perPage,
    total,
    pages,
    has_next: hasNext,
    has_prev: hasPrev,
  };
}

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

/**
 * The backend serves relative `/static/img/...` placeholders in place of a
 * missing photo. Components render their own placeholder for `null`, so only
 * absolute URLs survive this layer.
 */
export function normalizeImageUrl(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string' || !ABSOLUTE_URL_PATTERN.test(value)) {
    return null;
  }

  return value;
}

export function parseArray(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }

  return value;
}

export function buildQueryString(params: QueryParam[]): string {
  if (params.length === 0) {
    return '';
  }

  const query = params
    .map(
      ([name, value]) =>
        `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    )
    .join('&');

  return `?${query}`;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A deep link can carry anything, and the backend route only matches a UUID.
 * Checking here keeps a junk id from costing a request (and a rate-limit hit).
 */
export function isUuid(value: string | undefined): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function matchEnum<T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
): T | null {
  return typeof value === 'string' && allowedValues.includes(value as T)
    ? (value as T)
    : null;
}

export type UserSummary = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_image_url: string | null;
};

export function parseUserSummary(value: unknown, message: string): UserSummary {
  if (!isObject(value)) {
    throw new Error(message);
  }

  const {
    first_name: firstName,
    full_name: fullName,
    id,
    last_name: lastName,
    profile_image_url: profileImageUrl,
  } = value;

  if (
    !isString(id) ||
    !isString(firstName) ||
    !isString(lastName) ||
    !isString(fullName) ||
    !isNullableString(profileImageUrl)
  ) {
    throw new Error(message);
  }

  return {
    id,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    profile_image_url: normalizeImageUrl(profileImageUrl),
  };
}

export const LOAN_STATUSES = [
  'pending',
  'approved',
  'canceled',
  'denied',
  'completed',
] as const;

export type LoanStatus = (typeof LOAN_STATUSES)[number];

export type LoanSummary = {
  id: string;
  /** `YYYY-MM-DD`, not a datetime. */
  start_date: string;
  end_date: string;
  /** `null` when the server reports a status this client does not know. */
  status: LoanStatus | null;
  borrower: UserSummary | null;
};

export function parseLoanSummary(value: unknown, message: string): LoanSummary {
  if (!isObject(value)) {
    throw new Error(message);
  }

  const {
    borrower,
    end_date: endDate,
    id,
    start_date: startDate,
    status,
  } = value;

  if (
    !isString(id) ||
    !isString(startDate) ||
    !isString(endDate) ||
    !isNullableString(status)
  ) {
    throw new Error(message);
  }

  return {
    id,
    start_date: startDate,
    end_date: endDate,
    status: matchEnum(status, LOAN_STATUSES),
    borrower:
      borrower === null || borrower === undefined
        ? null
        : parseUserSummary(borrower, message),
  };
}
