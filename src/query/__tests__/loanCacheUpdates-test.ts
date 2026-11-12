import { QueryObserver, type QueryKey } from '@tanstack/react-query';

import { feedKeys, itemKeys, loanKeys, messageKeys } from '../../lib/queryKeys';
import { createTestQueryClient } from '../../test-utils/renderWithProviders';
import { invalidateLoanCaches } from '../loanCacheUpdates';

const LOAN_ID = 'f1111111-1111-4111-8111-111111111111';
const ITEM_ID = 'b2222222-2222-4222-8222-222222222222';
const OTHER_ITEM_ID = 'e5555555-5555-4555-8555-555555555555';
const loan = { id: LOAN_ID, item: { id: ITEM_ID } };

function setup() {
  const queryClient = createTestQueryClient();

  // Kept and fresh, so seeded entries are neither dropped (gcTime: 0 in the
  // test client) nor refetched on their own.
  for (const key of [
    loanKeys.all,
    itemKeys.all,
    feedKeys.all,
    messageKeys.all,
  ]) {
    queryClient.setQueryDefaults(key, {
      gcTime: Infinity,
      staleTime: Infinity,
    });
  }

  const unsubscribes: (() => void)[] = [];

  // Seeds a query and, when `mounted`, observes it like a screen would.
  function seed(queryKey: QueryKey, mounted: boolean) {
    const queryFn = jest.fn(async () => ({ refetched: true }));

    queryClient.setQueryData(queryKey, { refetched: false });

    if (mounted) {
      const observer = new QueryObserver(queryClient, { queryKey, queryFn });

      unsubscribes.push(observer.subscribe(() => {}));
    }

    return queryFn;
  }

  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

  // The helper is fire-and-forget; settle every invalidation it started.
  async function run() {
    invalidateLoanCaches(queryClient, loan);
    await Promise.all(invalidateSpy.mock.results.map((call) => call.value));
  }

  return {
    queryClient,
    invalidateSpy,
    seed,
    run,
    cleanup: () => unsubscribes.forEach((unsubscribe) => unsubscribe()),
  };
}

test('invalidates each key with the chosen refetchType', async () => {
  const { invalidateSpy, run, cleanup } = setup();

  await run();

  expect(invalidateSpy).toHaveBeenCalledTimes(6);
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: loanKeys.all,
    refetchType: 'none',
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: loanKeys.detail(LOAN_ID),
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: itemKeys.detail(ITEM_ID),
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: itemKeys.all,
    predicate: expect.any(Function),
    refetchType: 'none',
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: feedKeys.all,
    refetchType: 'none',
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: messageKeys.all,
    refetchType: 'none',
  });

  cleanup();
});

test('refetches the mounted loan and item details exactly once', async () => {
  const { queryClient, seed, run, cleanup } = setup();
  const fetchLoan = seed(loanKeys.detail(LOAN_ID), true);
  const fetchItem = seed(itemKeys.detail(ITEM_ID), true);

  await run();

  expect(fetchLoan).toHaveBeenCalledTimes(1);
  expect(fetchItem).toHaveBeenCalledTimes(1);
  expect(queryClient.getQueryData(loanKeys.detail(LOAN_ID))).toEqual({
    refetched: true,
  });
  expect(queryClient.getQueryData(itemKeys.detail(ITEM_ID))).toEqual({
    refetched: true,
  });

  cleanup();
});

test('marks mounted lists and messages stale without refetching', async () => {
  const { queryClient, seed, run, cleanup } = setup();
  const keys = [
    loanKeys.list({ role: 'borrowing' }),
    loanKeys.list({ role: 'lending' }),
    itemKeys.list(),
    itemKeys.mine({ kind: 'lending' }),
    itemKeys.detail(OTHER_ITEM_ID),
    feedKeys.list(),
    messageKeys.inbox({ status: 'inbox' }),
    messageKeys.thread('m1'),
  ];
  const fetches = keys.map((key) => seed(key, true));

  await run();

  for (const [index, key] of keys.entries()) {
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    expect(fetches[index]).not.toHaveBeenCalled();
  }

  cleanup();
});

test('an unmounted loan detail is marked stale and left for its next mount', async () => {
  const { queryClient, seed, run, cleanup } = setup();
  const fetchLoan = seed(loanKeys.detail(LOAN_ID), false);

  await run();

  expect(
    queryClient.getQueryState(loanKeys.detail(LOAN_ID))?.isInvalidated,
  ).toBe(true);
  expect(fetchLoan).not.toHaveBeenCalled();

  cleanup();
});
