import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import {
  requestLoan,
  type LoanMutationResponse,
  type LoanRequestInput,
} from '../lib/loans';
import { useSession } from '../session/SessionProvider';
import { invalidateLoanCaches } from './loanCacheUpdates';

export function useRequestLoanMutation(
  itemId: string,
): UseMutationResult<LoanMutationResponse, Error, LoanRequestInput> {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<LoanMutationResponse, Error, LoanRequestInput>({
    mutationFn: (input) => requestLoan(authenticatedApiFetch, itemId, input),
    onSuccess: (response) => invalidateLoanCaches(queryClient, response.loan),
  });
}
