import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  extendLoan,
  type LoanExtendInput,
  type LoanExtendResponse,
} from '../lib/loans';
import { useSession } from '../session/SessionProvider';
import { invalidateLoanCaches } from './loanCacheUpdates';

/** Change an approved loan's due date, then refresh the loan caches. */
export function useExtendLoanMutation(loanId: string) {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<LoanExtendResponse, Error, LoanExtendInput>({
    mutationFn: (input) => extendLoan(authenticatedApiFetch, loanId, input),
    onSuccess: (response) => invalidateLoanCaches(queryClient, response.loan),
  });
}
