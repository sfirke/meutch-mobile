import { isApiError } from './api';
import { SessionExpiredError, SessionRequiredError } from './session';

export type ErrorCopyKey =
  | 'RATE_LIMIT_EXCEEDED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'API_READ_ONLY'
  | 'API_DISABLED'
  | 'BAD_REQUEST'
  | 'INVALID_ACTION'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'OFFLINE'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN';

export type ErrorCopy = {
  title: string;
  message: string;
  canRetry: boolean;
};

export type ErrorCopyOverrides = Partial<
  Record<ErrorCopyKey, Partial<ErrorCopy>>
>;

const RATE_LIMIT_COPY: ErrorCopy = {
  title: 'Slow down',
  message: "You're doing that a bit too fast. Try again in a moment.",
  canRetry: true,
};

const FORBIDDEN_COPY: ErrorCopy = {
  title: "You don't have access",
  message: "You don't have permission to see this.",
  canRetry: false,
};

const NOT_FOUND_COPY: ErrorCopy = {
  title: 'Not found',
  message: "This isn't available anymore.",
  canRetry: false,
};

// Titles for write failures whose message comes from the backend verbatim.
// BAD_REQUEST is what "already a member / already requested" returns.
const WRITE_FAILURE_TITLES = {
  BAD_REQUEST: "That didn't work",
  INVALID_ACTION: "That didn't work",
  CONFLICT: 'Already done',
  VALIDATION_ERROR: 'Check your input',
} as const;

const MAINTENANCE_COPY: ErrorCopy = {
  title: 'Meutch is temporarily unavailable',
  message: "We're doing some maintenance. Please try again soon.",
  canRetry: true,
};

const OFFLINE_COPY: ErrorCopy = {
  title: 'You appear to be offline',
  message: 'Check your connection and try again.',
  canRetry: true,
};

const SESSION_EXPIRED_COPY: ErrorCopy = {
  title: 'Please sign in again',
  message: 'Your session has ended.',
  canRetry: false,
};

const GENERIC_COPY: ErrorCopy = {
  title: 'Something went wrong',
  message: 'Please try again.',
  canRetry: true,
};

function classify(error: unknown): { key: ErrorCopyKey; copy: ErrorCopy } {
  if (
    error instanceof SessionExpiredError ||
    error instanceof SessionRequiredError
  ) {
    return { key: 'SESSION_EXPIRED', copy: SESSION_EXPIRED_COPY };
  }

  if (isApiError(error)) {
    switch (error.code) {
      case 'RATE_LIMIT_EXCEEDED':
        return { key: 'RATE_LIMIT_EXCEEDED', copy: RATE_LIMIT_COPY };
      case 'FORBIDDEN':
        return { key: 'FORBIDDEN', copy: FORBIDDEN_COPY };
      case 'NOT_FOUND':
        return { key: 'NOT_FOUND', copy: NOT_FOUND_COPY };
      case 'API_READ_ONLY':
        return { key: 'API_READ_ONLY', copy: MAINTENANCE_COPY };
      case 'API_DISABLED':
        return { key: 'API_DISABLED', copy: MAINTENANCE_COPY };
      case 'BAD_REQUEST':
      case 'INVALID_ACTION':
      case 'CONFLICT':
      case 'VALIDATION_ERROR':
        return {
          key: error.code,
          copy: {
            title: WRITE_FAILURE_TITLES[error.code],
            message: error.message || GENERIC_COPY.message,
            canRetry: false,
          },
        };
      default:
        // An unrecognised ApiError's message comes from our own backend, so
        // (unlike an arbitrary thrown error) it is safe to show verbatim.
        return {
          key: 'UNKNOWN',
          copy: {
            ...GENERIC_COPY,
            message: error.message || GENERIC_COPY.message,
          },
        };
    }
  }

  // React Native's fetch rejects with a TypeError when the device is offline.
  if (error instanceof TypeError) {
    return { key: 'OFFLINE', copy: OFFLINE_COPY };
  }

  return { key: 'UNKNOWN', copy: GENERIC_COPY };
}

/**
 * Maps an already-parsed error to member-facing copy. Never re-parses a
 * response — pass it the error `api.ts` / `session.ts` already threw.
 */
export function describeError(
  error: unknown,
  overrides?: ErrorCopyOverrides,
): ErrorCopy {
  const { key, copy } = classify(error);

  return { ...copy, ...overrides?.[key] };
}

/** A 422 puts the per-field reason in `details[field]`; prefer it over the generic. */
export function readFieldError(error: unknown, field: string): string | null {
  if (!isApiError(error)) {
    return null;
  }

  const detail = error.details?.[field];

  if (Array.isArray(detail)) {
    const [first] = detail;

    return typeof first === 'string' ? first : null;
  }

  return typeof detail === 'string' ? detail : null;
}
