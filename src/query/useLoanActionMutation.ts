import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  performLoanAction,
  type LoanAction,
  type LoanMutationResponse,
} from '../lib/loans';
import { useSession } from '../session/SessionProvider';
import { invalidateLoanCaches } from './loanCacheUpdates';

/** Approve, deny, cancel, or complete a loan, then refresh the loan caches. */
export function useLoanActionMutation(loanId: string) {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<LoanMutationResponse, Error, LoanAction>({
    mutationFn: (action) =>
      performLoanAction(authenticatedApiFetch, loanId, action),
    // Invalidate rather than write the detail cache; see loanCacheUpdates.ts.
    onSuccess: (response) => invalidateLoanCaches(queryClient, response.loan),
  });
}
