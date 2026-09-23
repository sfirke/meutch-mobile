import { createApiFetch, RequestTimeoutError } from '../api';

function fetchThatHangsUntilAborted() {
  return jest.fn(
    (_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  );
}

describe('createApiFetch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('rejects with RequestTimeoutError when the server never answers', async () => {
    const fetchImpl = fetchThatHangsUntilAborted();
    const request = createApiFetch(fetchImpl as unknown as typeof fetch, 1000);

    const pending = request('/feed');
    jest.advanceTimersByTime(1000);

    await expect(pending).rejects.toBeInstanceOf(RequestTimeoutError);
  });

  test('passes a caller abort through as an abort, not a timeout', async () => {
    const fetchImpl = fetchThatHangsUntilAborted();
    const request = createApiFetch(fetchImpl as unknown as typeof fetch, 1000);
    const controller = new AbortController();

    const pending = request('/feed', { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  test('clears the timer once the response arrives', async () => {
    const response = { ok: true, status: 200 } as Response;
    const fetchImpl = jest.fn(async () => response);
    const request = createApiFetch(fetchImpl as unknown as typeof fetch, 1000);

    await expect(request('/feed')).resolves.toBe(response);
    expect(jest.getTimerCount()).toBe(0);
  });
});
