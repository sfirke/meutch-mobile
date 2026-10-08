import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import {
  fetchMyLoans,
  type LoanActivity,
  type LoanListPage,
  type LoanRole,
} from '../lib/loans';
import { loanKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

/**
 * Infinite `GET /me/loans` page for one role, flattened and de-duplicated by
 * `id` (offset paging over live data can repeat a row across pages).
 */
export function useMyLoansQuery(role: LoanRole) {
  const { authenticatedApiFetch } = useSession();

  const query = useInfiniteQuery({
    queryKey: loanKeys.list({ role }),
    queryFn: ({ pageParam, signal }) =>
      fetchMyLoans(authenticatedApiFetch, {
        role,
        page: pageParam,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: LoanListPage): number | undefined =>
      lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
    // Keeps the previous list on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

  const loans: LoanActivity[] = [];
  const seenIds = new Set<string>();

  for (const page of query.data?.pages ?? []) {
    for (const loan of page.loans) {
      if (!seenIds.has(loan.id)) {
        seenIds.add(loan.id);
        loans.push(loan);
      }
    }
  }

  return { ...query, loans };
}
