import { ApiError, isApiError, readApiError, readJsonOrThrow } from '../api';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

describe('readApiError', () => {
  test('round-trips code, message, status and details for a 422', async () => {
    const response = createMockResponse(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input.',
          details: { body: ['Too long.'] },
        },
      },
      422,
    );

    const error = await readApiError(response);

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input.');
    expect(error.status).toBe(422);
    expect(error.details).toEqual({ body: ['Too long.'] });
  });

  test('yields null details when the body omits details', async () => {
    const response = createMockResponse({
      error: { code: 'NOT_FOUND', message: 'Missing.' },
    });

    const error = await readApiError(response);

    expect(error.details).toBeNull();
  });

  test('yields null details when the body sends details: null', async () => {
    const response = createMockResponse({
      error: { code: 'NOT_FOUND', message: 'Missing.', details: null },
    });

    const error = await readApiError(response);

    expect(error.details).toBeNull();
  });

  test('yields null details when details is an array', async () => {
    const response = createMockResponse({
      error: { code: 'NOT_FOUND', message: 'Missing.', details: ['x'] },
    });

    const error = await readApiError(response);

    expect(error.details).toBeNull();
  });

  test('falls back to a status-based message for a non-JSON body', async () => {
    const response = {
      ok: false,
      status: 500,
      json: jest.fn(async () => {
        throw new Error('not json');
      }),
      clone: jest.fn(() => response),
    } as unknown as Response;

    const error = await readApiError(response);

    expect(error.code).toBe('API_ERROR');
    expect(error.message).toBe('Request failed with status 500.');
    expect(error.details).toBeNull();
  });
});

describe('readJsonOrThrow', () => {
  test('returns the parsed body on a 2xx response', async () => {
    const response = createMockResponse({ ok: true });

    await expect(readJsonOrThrow(response)).resolves.toEqual({ ok: true });
  });

  test('throws an ApiError on a non-2xx response', async () => {
    const response = createMockResponse(
      { error: { code: 'FORBIDDEN', message: 'No access.' } },
      403,
    );

    const error = await readJsonOrThrow(response).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('FORBIDDEN');
  });
});

describe('ApiError', () => {
  test('defaults details to null when not provided', () => {
    const error = new ApiError({
      code: 'NOT_FOUND',
      message: 'Missing.',
      status: 404,
    });

    expect(error.details).toBeNull();
  });
});
