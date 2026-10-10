import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { requestPasswordReset } from '../lib/accountRecovery';
import type { RecoveryResult } from '../lib/accountRecovery';
import { apiFetch } from '../lib/api';

// Runs while signed out, so it uses the bare apiFetch, not the session's.
export function useRequestPasswordResetMutation(): UseMutationResult<
  RecoveryResult,
  Error,
  string
> {
  return useMutation({
    mutationFn: (email: string) => requestPasswordReset(apiFetch, email),
  });
}
