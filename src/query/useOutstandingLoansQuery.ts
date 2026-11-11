import { useQuery } from '@tanstack/react-query';

import { fetchOutstandingLoans, type OutstandingLoans } from '../lib/account';
import { loanKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export function useOutstandingLoansQuery() {
  const { authenticatedApiFetch } = useSession();

  return useQuery<OutstandingLoans>({
    queryKey: loanKeys.summary(),
    queryFn: ({ signal }) =>
      fetchOutstandingLoans(authenticatedApiFetch, { signal }),
    // Refetch every time the Delete Account screen opens.
    staleTime: 0,
  });
}
