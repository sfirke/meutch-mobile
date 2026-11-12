import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import {
  requestLoanExtension,
  type LoanExtensionRequestInput,
  type LoanMutationResponse,
} from '../lib/loans';
import { useSession } from '../session/SessionProvider';
import { invalidateLoanCaches } from './loanCacheUpdates';

/** Ask the owner to move the due date, then refresh the loan caches. */
export function useRequestExtensionMutation(
  loanId: string,
): UseMutationResult<LoanMutationResponse, Error, LoanExtensionRequestInput> {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<LoanMutationResponse, Error, LoanExtensionRequestInput>({
    mutationFn: (input) =>
      requestLoanExtension(authenticatedApiFetch, loanId, input),
    onSuccess: (response) => invalidateLoanCaches(queryClient, response.loan),
  });
}
