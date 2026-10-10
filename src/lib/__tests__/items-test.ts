import type { ApiFetch } from '../api';
import { isApiError } from '../api';
import {
  createItem,
  deleteItem,
  fetchItemDetail,
  fetchItems,
  fetchMyItems,
  MY_ITEM_KINDS,
  updateItem,
  type ItemWriteInput,
} from '../items';

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
    clone: jest.fn(() => createMockResponse(body, status)),
  } as unknown as Response;
}

const OWNER_ID = 'a1111111-1111-4111-8111-111111111111';
const ITEM_ID = 'b2222222-2222-4222-8222-222222222222';

const owner = {
  id: OWNER_ID,
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
  profile_viewable: false,
};

function createItemSummary(overrides?: Record<string, unknown>) {
  return {
    id: ITEM_ID,
    name: 'Cordless drill',
    description: 'Charger included.',
    available: true,
    is_giveaway: false,
    giveaway_visibility: null,
    claim_status: null,
    created_at: '2026-05-26T18:30:00+00:00',
    image_url: 'https://cdn.example.test/img/drill.jpg',
    owner,
    category: { id: 'c3333333-3333-4333-8333-333333333333', name: 'Tools' },
    tags: [{ id: 'd4444444-4444-4444-8444-444444444444', name: 'power' }],
    ...overrides,
  };
}

const pagination = {
  page: 1,
  per_page: 12,
  total: 1,
  pages: 1,
  has_next: false,
  has_prev: false,
};

function getRequestPath(fetchImpl: jest.MockedFunction<ApiFetch>): string {
  return fetchImpl.mock.calls[0][0];
}

describe('fetchItems', () => {
  test('parses an item page and requests the expected path', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ items: [createItemSummary()], pagination }),
    );

    const page = await fetchItems(fetchImpl, { page: 1 });

    expect(getRequestPath(fetchImpl)).toBe('/items?page=1');
    expect(page.pagination).toEqual(pagination);
    expect(page.items).toEqual([
      {
        id: ITEM_ID,
        name: 'Cordless drill',
        description: 'Charger included.',
        available: true,
        is_giveaway: false,
        giveaway_visibility: null,
        claim_status: null,
        created_at: '2026-05-26T18:30:00+00:00',
        image_url: 'https://cdn.example.test/img/drill.jpg',
        owner,
        category: { id: 'c3333333-3333-4333-8333-333333333333', name: 'Tools' },
        tags: [{ id: 'd4444444-4444-4444-8444-444444444444', name: 'power' }],
      },
    ]);
  });

  test('keeps a null image url as null', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        items: [createItemSummary({ image_url: null })],
        pagination,
      }),
    );

    const page = await fetchItems(fetchImpl, { page: 1 });

    expect(page.items[0].image_url).toBeNull();
  });

  test('url-encodes a search query and sends per_page only when set', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ items: [], pagination }),
    );

    await fetchItems(fetchImpl, { page: 3, q: ' drill & bits ', perPage: 50 });

    expect(getRequestPath(fetchImpl)).toBe(
      '/items?page=3&q=drill%20%26%20bits&per_page=50',
    );
  });

  test('omits a blank search query', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ items: [], pagination }),
    );

    await fetchItems(fetchImpl, { page: 1, q: '   ' });

    expect(getRequestPath(fetchImpl)).toBe('/items?page=1');
  });

  test('forwards the abort signal', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const controller = new AbortController();

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ items: [], pagination }),
    );

    await fetchItems(fetchImpl, { page: 1, signal: controller.signal });

    expect(fetchImpl).toHaveBeenCalledWith('/items?page=1', {
      signal: controller.signal,
    });
  });

  test('rejects a malformed item', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        items: [createItemSummary({ available: 'yes' })],
        pagination,
      }),
    );

    await expect(fetchItems(fetchImpl, { page: 1 })).rejects.toThrow(
      'Invalid item payload.',
    );
  });

  test('keeps an item whose owner account was deleted', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        items: [createItemSummary({ owner: null }), createItemSummary()],
        pagination,
      }),
    );

    const { items } = await fetchItems(fetchImpl, { page: 1 });

    expect(items).toHaveLength(2);
    expect(items[0].owner).toBeNull();
    expect(items[1].owner?.full_name).toBe('Ada Example');
  });

  test('propagates a 403 as an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You are not allowed to view this item.',
            details: {},
          },
        },
        403,
      ),
    );

    const error = await fetchItems(fetchImpl, { page: 1 }).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('FORBIDDEN');
    expect(isApiError(error) && error.status).toBe(403);
  });

  describe('filters', () => {
    const CATEGORY_A = 'e5555555-5555-4555-8555-555555555555';
    const CATEGORY_B = 'f6666666-6666-4666-8666-666666666666';
    const CIRCLE_A = 'a7777777-7777-4777-8777-777777777777';
    const CIRCLE_B = 'b8888888-8888-4888-8888-888888888888';

    async function requestPath(
      options: Parameters<typeof fetchItems>[1],
    ): Promise<string> {
      const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

      fetchImpl.mockResolvedValueOnce(
        createMockResponse({ items: [], pagination }),
      );

      await fetchItems(fetchImpl, options);

      return getRequestPath(fetchImpl);
    }

    test('repeats the categories key in the given order', async () => {
      expect(
        await requestPath({ page: 1, categories: [CATEGORY_B, CATEGORY_A] }),
      ).toBe(`/items?page=1&categories=${CATEGORY_B}&categories=${CATEGORY_A}`);
    });

    test('repeats the circles key', async () => {
      expect(
        await requestPath({ page: 1, circles: [CIRCLE_A, CIRCLE_B] }),
      ).toBe(`/items?page=1&circles=${CIRCLE_A}&circles=${CIRCLE_B}`);
    });

    test('sends item_type loans', async () => {
      expect(await requestPath({ page: 1, itemType: 'loans' })).toBe(
        '/items?page=1&item_type=loans',
      );
    });

    test('sends item_type giveaways', async () => {
      expect(await requestPath({ page: 1, itemType: 'giveaways' })).toBe(
        '/items?page=1&item_type=giveaways',
      );
    });

    test('sends sort distance', async () => {
      expect(await requestPath({ page: 1, sort: 'distance' })).toBe(
        '/items?page=1&sort=distance',
      );
    });

    test('orders page, q, per_page, categories, circles, item_type, sort', async () => {
      expect(
        await requestPath({
          page: 2,
          q: 'drill',
          perPage: 20,
          categories: [CATEGORY_A, CATEGORY_B],
          circles: [CIRCLE_A],
          itemType: 'loans',
          sort: 'distance',
        }),
      ).toBe(
        `/items?page=2&q=drill&per_page=20&categories=${CATEGORY_A}&categories=${CATEGORY_B}&circles=${CIRCLE_A}&item_type=loans&sort=distance`,
      );
    });

    test('never sends defaults', async () => {
      expect(await requestPath({ page: 1 })).toBe('/items?page=1');
      expect(
        await requestPath({
          page: 1,
          itemType: 'both',
          sort: 'date',
          categories: [],
          circles: [],
        }),
      ).toBe('/items?page=1');
    });
  });
});

describe('fetchMyItems', () => {
  test.each(MY_ITEM_KINDS)('requests the %s kind', async (kind) => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ items: [], pagination }),
    );

    await fetchMyItems(fetchImpl, { kind, page: 2 });

    expect(getRequestPath(fetchImpl)).toBe(`/me/items?kind=${kind}&page=2`);
  });

  test('trims the search query and sends per_page when set', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ items: [], pagination }),
    );

    await fetchMyItems(fetchImpl, {
      kind: 'lending',
      page: 1,
      q: ' drill & bits ',
      perPage: 50,
    });

    expect(getRequestPath(fetchImpl)).toBe(
      '/me/items?kind=lending&page=1&q=drill%20%26%20bits&per_page=50',
    );
  });

  test('omits a blank search query', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ items: [], pagination }),
    );

    await fetchMyItems(fetchImpl, { kind: 'lending', page: 1, q: '   ' });

    expect(getRequestPath(fetchImpl)).toBe('/me/items?kind=lending&page=1');
  });

  test('forwards the abort signal', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;
    const controller = new AbortController();

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ items: [], pagination }),
    );

    await fetchMyItems(fetchImpl, {
      kind: 'past_giveaways',
      page: 1,
      signal: controller.signal,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      '/me/items?kind=past_giveaways&page=1',
      { signal: controller.signal },
    );
  });

  test('parses an item page', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({ items: [createItemSummary()], pagination }),
    );

    const page = await fetchMyItems(fetchImpl, { kind: 'lending', page: 1 });

    expect(page.pagination).toEqual(pagination);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].id).toBe(ITEM_ID);
    expect(page.items[0].owner?.full_name).toBe('Ada Example');
  });

  test('rejects a malformed payload', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        items: [createItemSummary({ available: 'yes' })],
        pagination,
      }),
    );

    await expect(
      fetchMyItems(fetchImpl, { kind: 'lending', page: 1 }),
    ).rejects.toThrow('Invalid item payload.');
  });

  test('propagates a non-2xx response as an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid kind.',
            details: {},
          },
        },
        422,
      ),
    );

    const error = await fetchMyItems(fetchImpl, {
      kind: 'lending',
      page: 1,
    }).catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.status).toBe(422);
  });
});

describe('fetchItemDetail', () => {
  test('parses a detail payload and sorts images by position', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        item: createItemSummary({
          images: [
            {
              id: 'f6666666-6666-4666-8666-666666666666',
              url: 'https://cdn.example.test/img/drill-2.jpg',
              position: 2,
              created_at: '2026-05-26T18:31:00+00:00',
            },
            {
              id: 'f7777777-7777-4777-8777-777777777777',
              url: 'https://cdn.example.test/img/drill-0.jpg',
              position: 0,
              created_at: '2026-05-26T18:29:00+00:00',
            },
            {
              id: 'f8888888-8888-4888-8888-888888888888',
              url: 'https://cdn.example.test/img/drill-1.jpg',
              position: 1,
              created_at: '2026-05-26T18:30:00+00:00',
            },
          ],
          claimed_by: null,
          current_loan: {
            id: 'a9999999-9999-4999-8999-999999999999',
            start_date: '2026-06-01',
            end_date: '2026-06-08',
            status: 'approved',
            borrower: {
              id: 'ba111111-1111-4111-8111-111111111111',
              first_name: 'Bo',
              last_name: 'Example',
              full_name: 'Bo Example',
              profile_image_url: null,
            },
          },
          viewer_interest_status: null,
          interested_count: null,
        }),
        viewer: {
          is_owner: false,
          shares_circle_with_owner: true,
          is_active_borrower: false,
        },
      }),
    );

    const { item, viewer } = await fetchItemDetail(fetchImpl, ITEM_ID);

    expect(getRequestPath(fetchImpl)).toBe(`/items/${ITEM_ID}`);
    expect(item.images.map((image) => image.position)).toEqual([0, 1, 2]);
    expect(item.current_loan?.start_date).toBe('2026-06-01');
    expect(item.current_loan?.borrower?.full_name).toBe('Bo Example');
    expect(item.claimed_by).toBeNull();
    expect(item.viewer_interest_status).toBeNull();
    expect(viewer).toEqual({
      is_owner: false,
      shares_circle_with_owner: true,
      is_active_borrower: false,
    });
  });

  test('keeps a loan whose status this client does not know', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        item: createItemSummary({
          images: [],
          claimed_by: null,
          current_loan: {
            id: 'a9999999-9999-4999-8999-999999999999',
            start_date: '2026-06-01',
            end_date: '2026-06-08',
            status: 'renegotiating',
            borrower: null,
          },
          viewer_interest_status: null,
          interested_count: null,
        }),
        viewer: {
          is_owner: false,
          shares_circle_with_owner: true,
          is_active_borrower: false,
        },
      }),
    );

    const { item } = await fetchItemDetail(fetchImpl, ITEM_ID);

    expect(item.current_loan?.status).toBeNull();
    expect(item.current_loan?.end_date).toBe('2026-06-08');
  });

  test('parses a giveaway with viewer interest state', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        item: createItemSummary({
          is_giveaway: true,
          giveaway_visibility: 'public',
          claim_status: 'pending_pickup',
          images: [],
          claimed_by: owner,
          current_loan: null,
          viewer_interest_status: 'selected',
          interested_count: 3,
        }),
        viewer: {
          is_owner: true,
          shares_circle_with_owner: false,
          is_active_borrower: false,
        },
      }),
    );

    const { item } = await fetchItemDetail(fetchImpl, ITEM_ID);

    expect(item.giveaway_visibility).toBe('public');
    expect(item.claim_status).toBe('pending_pickup');
    expect(item.viewer_interest_status).toBe('selected');
    expect(item.interested_count).toBe(3);
    expect(item.claimed_by?.id).toBe(OWNER_ID);
  });

  test('rejects a detail payload with a malformed viewer block', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse({
        item: createItemSummary({
          images: [],
          claimed_by: null,
          current_loan: null,
          viewer_interest_status: null,
          interested_count: null,
        }),
        viewer: { is_owner: false },
      }),
    );

    await expect(fetchItemDetail(fetchImpl, ITEM_ID)).rejects.toThrow(
      'Invalid item detail payload.',
    );
  });

  test('propagates a 404 as an ApiError', async () => {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(
      createMockResponse(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found.',
            details: {},
          },
        },
        404,
      ),
    );

    const error = await fetchItemDetail(fetchImpl, ITEM_ID).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('NOT_FOUND');
    expect(isApiError(error) && error.status).toBe(404);
  });
});

describe('item writes', () => {
  const input: ItemWriteInput = {
    name: 'Cordless drill',
    description: null,
    category_id: 'c3333333-3333-4333-8333-333333333333',
    tags: ['power', 'tools'],
    is_giveaway: false,
    giveaway_visibility: null,
  };
  const detailBody = {
    item: createItemSummary({
      images: [],
      current_loan: null,
      claimed_by: null,
      viewer_interest_status: null,
      interested_count: null,
    }),
    viewer: {
      is_owner: true,
      shares_circle_with_owner: true,
      is_active_borrower: false,
    },
  };

  function mockFetch(body: unknown, status = 200) {
    const fetchImpl = jest.fn() as jest.MockedFunction<ApiFetch>;

    fetchImpl.mockResolvedValueOnce(createMockResponse(body, status));

    return fetchImpl;
  }

  function getInit(fetchImpl: jest.MockedFunction<ApiFetch>) {
    return fetchImpl.mock.calls[0][1] as RequestInit;
  }

  function errorBody(code: string, message: string, details = {}) {
    return { error: { code, message, details } };
  }

  test('createItem posts the exact body with the creation token', async () => {
    const fetchImpl = mockFetch(detailBody, 201);

    const { item, viewer } = await createItem(fetchImpl, input, 'token-1');
    const init = getInit(fetchImpl);

    expect(getRequestPath(fetchImpl)).toBe('/items');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body as string)).toEqual({
      ...input,
      creation_token: 'token-1',
    });
    expect(item.id).toBe(ITEM_ID);
    expect(viewer.is_owner).toBe(true);
  });

  test('createItem returns the existing item on a 200 replay', async () => {
    const fetchImpl = mockFetch(detailBody, 200);

    const { item } = await createItem(fetchImpl, input, 'token-1');

    expect(item.name).toBe('Cordless drill');
  });

  test('createItem rejects a 422 with details', async () => {
    const fetchImpl = mockFetch(
      errorBody('VALIDATION_ERROR', 'Invalid.', { name: ['Required.'] }),
      422,
    );

    const error = await createItem(fetchImpl, input, 't').catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.status).toBe(422);
    expect(isApiError(error) && error.details).toEqual({
      name: ['Required.'],
    });
  });

  test('updateItem patches the body without a creation token', async () => {
    const fetchImpl = mockFetch(detailBody);
    const giveaway: ItemWriteInput = {
      ...input,
      is_giveaway: true,
      giveaway_visibility: 'public',
      tags: [],
    };

    const { item } = await updateItem(fetchImpl, 'id/with space', giveaway);
    const init = getInit(fetchImpl);

    expect(getRequestPath(fetchImpl)).toBe('/items/id%2Fwith%20space');
    expect(init.method).toBe('PATCH');
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body as string)).toEqual(giveaway);
    expect(item.id).toBe(ITEM_ID);
  });

  test('updateItem rejects a 422 with details', async () => {
    const fetchImpl = mockFetch(
      errorBody('VALIDATION_ERROR', 'Invalid.', { tags: ['Too many.'] }),
      422,
    );

    const error = await updateItem(fetchImpl, ITEM_ID, input).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error) && error.details).toEqual({
      tags: ['Too many.'],
    });
  });

  test('deleteItem sends DELETE and parses the result', async () => {
    const fetchImpl = mockFetch({ deleted: true, item_id: ITEM_ID });

    const result = await deleteItem(fetchImpl, ITEM_ID);

    expect(getRequestPath(fetchImpl)).toBe(`/items/${ITEM_ID}`);
    expect(getInit(fetchImpl).method).toBe('DELETE');
    expect(getInit(fetchImpl).headers).toMatchObject({
      Accept: 'application/json',
    });
    expect(result).toEqual({ deleted: true, item_id: ITEM_ID });
  });

  test('deleteItem rejects a 409 with the server message', async () => {
    const message = 'This item has an active loan and cannot be deleted.';
    const fetchImpl = mockFetch(errorBody('CONFLICT', message), 409);

    const error = await deleteItem(fetchImpl, ITEM_ID).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error) && error.code).toBe('CONFLICT');
    expect(isApiError(error) && error.status).toBe(409);
    expect(error).toHaveProperty('message', message);
  });

  test('deleteItem rejects a malformed result', async () => {
    const fetchImpl = mockFetch({ deleted: 'yes' });

    await expect(deleteItem(fetchImpl, ITEM_ID)).rejects.toThrow(
      'Invalid item payload.',
    );
  });
});
