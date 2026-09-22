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
