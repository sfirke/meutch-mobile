import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { resendConfirmation } from '../lib/accountRecovery';
import type { RecoveryResult } from '../lib/accountRecovery';
import { apiFetch } from '../lib/api';

// Runs while signed out, so it uses the bare apiFetch, not the session's.
export function useResendConfirmationMutation(): UseMutationResult<
  RecoveryResult,
  Error,
  string
> {
  return useMutation({
    mutationFn: (email: string) => resendConfirmation(apiFetch, email),
  });
}
