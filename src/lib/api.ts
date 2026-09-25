import { buildApiUrl } from '../config/env';

export type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  code: string;
  status: number;
  /** Field-level messages from a 422 validation error, e.g. `{ field: [messages] }`. */
  details: Record<string, unknown> | null;

  constructor({
    code,
    message,
    status,
    details = null,
  }: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown> | null;
  }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// React Native's fetch never gives up on its own, so a dropped connection
// would otherwise leave the request pending forever.
export const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;

export class RequestTimeoutError extends Error {
  constructor() {
    super('The request timed out.');
    this.name = 'RequestTimeoutError';
  }
}

export function createApiFetch(
  fetchImpl: typeof fetch = fetch,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): ApiFetch {
  return async (path, init) => {
    const controller = new AbortController();
    const callerSignal = init?.signal;
    const abortFromCaller = () => controller.abort();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    if (callerSignal?.aborted) {
      controller.abort();
    } else {
      callerSignal?.addEventListener('abort', abortFromCaller);
    }

    try {
      return await fetchImpl(buildApiUrl(path), {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) {
        throw new RequestTimeoutError();
      }

      throw error;
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', abortFromCaller);
    }
  };
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return createApiFetch()(path, init);
}

export function mergeHeaders(
  headers?: HeadersInit,
  extraHeaders?: Record<string, string>,
): Record<string, string> {
  const mergedHeaders: Record<string, string> = {};

  if (headers) {
    if (Array.isArray(headers)) {
      for (const [name, value] of headers) {
        mergedHeaders[name] = value;
      }
    } else if (typeof Headers !== 'undefined' && headers instanceof Headers) {
      headers.forEach((value, name) => {
        mergedHeaders[name] = value;
      });
    } else {
      Object.assign(mergedHeaders, headers);
    }
  }

  if (extraHeaders) {
    Object.assign(mergedHeaders, extraHeaders);
  }

  return mergedHeaders;
}

export function buildJsonRequestInit(
  body: unknown,
  init?: RequestInit,
): RequestInit {
  return {
    ...init,
    body: JSON.stringify(body),
    headers: mergeHeaders(init?.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
  };
}

export function withBearerToken(
  token: string,
  init?: RequestInit,
): RequestInit {
  return {
    ...init,
    headers: mergeHeaders(init?.headers, {
      Authorization: `Bearer ${token}`,
    }),
  };
}

export async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await readApiError(response);
  }

  return (await response.json()) as T;
}

export async function readApiError(response: Response): Promise<ApiError> {
  const clonedResponse =
    typeof response.clone === 'function' ? response.clone() : response;

  try {
    const payload = (await clonedResponse.json()) as ApiErrorEnvelope;
    const code = payload.error?.code || 'API_ERROR';
    const message =
      payload.error?.message ||
      `Request failed with status ${response.status}.`;
    const rawDetails = payload.error?.details;
    const details =
      rawDetails !== null &&
      typeof rawDetails === 'object' &&
      !Array.isArray(rawDetails)
        ? (rawDetails as Record<string, unknown>)
        : null;

    return new ApiError({ code, message, status: response.status, details });
  } catch {
    return new ApiError({
      code: 'API_ERROR',
      message: `Request failed with status ${response.status}.`,
      status: response.status,
    });
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
