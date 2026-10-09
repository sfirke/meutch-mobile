import type { ApiFetch } from '../api';
import { fetchCategories } from '../categories';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

const categories = [
  { id: 'a1111111-1111-4111-8111-111111111111', name: 'Books' },
  { id: 'b2222222-2222-4222-8222-222222222222', name: 'Tools' },
];

describe('fetchCategories', () => {
  test('requests /categories and parses the payload', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse({ categories }));

    await expect(fetchCategories(fetchImpl)).resolves.toEqual(categories);
    expect(fetchImpl.mock.calls[0][0]).toBe('/categories');
  });

  test.each([
    ['a missing categories key', {}],
    ['a non-array categories value', { categories: 'Tools' }],
    ['an entry missing name', { categories: [{ id: categories[0].id }] }],
  ])('rejects %s', async (_label, body) => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse(body));

    await expect(fetchCategories(fetchImpl)).rejects.toThrow(
      'Invalid categories payload.',
    );
  });
});
