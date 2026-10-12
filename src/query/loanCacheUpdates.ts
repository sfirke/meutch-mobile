import type { QueryClient } from '@tanstack/react-query';

import { itemKeys, loanKeys, messageKeys } from '../lib/queryKeys';
import { markItemListsStale } from './itemCacheUpdates';

/**
 * Shared cache update for every loan mutation. The loan detail and the item
 * detail refetch now if mounted; everything else is only marked stale, since
 * My loans, Inbox, and threads refetch on focus (`useRefreshOnFocus`) and a
 * burst of list requests from screens mounted underneath would eat into the
 * rate limit.
 */
export function invalidateLoanCaches(
  queryClient: QueryClient,
  loan: { id: string; item: { id: string } },
) {
  const itemDetailKey = itemKeys.detail(loan.item.id);

  void queryClient.invalidateQueries({
    queryKey: loanKeys.all,
    refetchType: 'none',
  });
  void queryClient.invalidateQueries({ queryKey: loanKeys.detail(loan.id) });

  // `current_loan`, `available`, and the viewer flags change with the status.
  void queryClient.invalidateQueries({ queryKey: itemDetailKey });
  markItemListsStale(queryClient, itemDetailKey);

  // Each action posts a message; the thread banner shows the active loan.
  void queryClient.invalidateQueries({
    queryKey: messageKeys.all,
    refetchType: 'none',
  });
}
