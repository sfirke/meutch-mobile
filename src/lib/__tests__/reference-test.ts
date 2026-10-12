import { fetchTags, parseTagsResponse } from '../reference';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

const ID_A = 'c3333333-3333-4333-8333-333333333333';
const ID_B = 'd4444444-4444-4444-8444-444444444444';

describe('reference lookups', () => {
  test('fetchTags requests /tags and keeps server order', async () => {
    const fetchImpl = jest.fn(async (_path: string, _init?: RequestInit) =>
      createMockResponse({
        tags: [
          { id: ID_A, name: 'zebra' },
          { id: ID_B, name: 'apple' },
        ],
      }),
    );

    const result = await fetchTags(fetchImpl);

    expect(fetchImpl.mock.calls[0][0]).toBe('/tags');
    expect(result).toEqual([
      { id: ID_A, name: 'zebra' },
      { id: ID_B, name: 'apple' },
    ]);
  });

  test('an empty list parses to an empty array', () => {
    expect(parseTagsResponse({ tags: [] })).toEqual([]);
  });

  test('malformed tag payloads throw', () => {
    expect(() => parseTagsResponse('nope')).toThrow();
    expect(() => parseTagsResponse({ categories: [] })).toThrow();
    expect(() => parseTagsResponse({ tags: [{ name: 'x' }] })).toThrow();
    expect(() => parseTagsResponse({ tags: [{ id: 1, name: 'x' }] })).toThrow();
  });
});
