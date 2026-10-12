import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import {
  decideLoanExtension,
  type LoanExtensionDecision,
  type LoanMutationResponse,
} from '../lib/loans';
import { useSession } from '../session/SessionProvider';
import { invalidateLoanCaches } from './loanCacheUpdates';

export type ExtensionDecisionVariables = {
  extensionId: string;
  decision: LoanExtensionDecision;
};

/** Approve or deny an extension request, then refresh the loan caches. */
export function useExtensionDecisionMutation(): UseMutationResult<
  LoanMutationResponse,
  Error,
  ExtensionDecisionVariables
> {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<LoanMutationResponse, Error, ExtensionDecisionVariables>({
    mutationFn: ({ extensionId, decision }) =>
      decideLoanExtension(authenticatedApiFetch, extensionId, decision),
    onSuccess: (response) => invalidateLoanCaches(queryClient, response.loan),
  });
}
