import type { ApiFetch } from '../api';
import { isApiError } from '../api';
import { fetchHasCircles } from '../circles';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

function createPagination(total: number) {
  return {
    page: 1,
    per_page: 1,
    total,
    pages: total,
    has_next: total > 1,
    has_prev: false,
  };
}

describe('fetchHasCircles', () => {
  test('returns true when the member has at least one circle', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        circles: [
          { id: 'a1111111-1111-4111-8111-111111111111', name: 'Maple Street' },
        ],
        pagination: createPagination(4),
      }),
    );

    await expect(fetchHasCircles(fetchImpl)).resolves.toBe(true);
    expect(fetchImpl.mock.calls[0][0]).toBe(
      '/circles?membership=mine&per_page=1',
    );
  });

  test('returns false when the member has no circles', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ circles: [], pagination: createPagination(0) }),
    );

    await expect(fetchHasCircles(fetchImpl)).resolves.toBe(false);
  });

  test('forwards the abort signal', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const controller = new AbortController();

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ circles: [], pagination: createPagination(0) }),
    );

    await fetchHasCircles(fetchImpl, { signal: controller.signal });

    expect(fetchImpl).toHaveBeenCalledWith(
      '/circles?membership=mine&per_page=1',
      { signal: controller.signal },
    );
  });

  test('rejects a payload without pagination', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse({ circles: [] }));

    await expect(fetchHasCircles(fetchImpl)).rejects.toThrow(
      'Invalid pagination payload.',
    );
  });

  test('propagates an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters.',
            details: {},
          },
        },
        422,
      ),
    );

    const error = await fetchHasCircles(fetchImpl).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('VALIDATION_ERROR');
    expect(isApiError(error) && error.status).toBe(422);
  });
});
