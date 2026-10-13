import { useMutation } from '@tanstack/react-query';

import { deleteAccount } from '../lib/account';
import { useSession } from '../session/SessionProvider';

export const ACCOUNT_DELETED_NOTICE = 'Your account has been deleted.';

export function useDeleteAccountMutation() {
  const { authenticatedApiFetch, discardSession } = useSession();

  return useMutation<void, Error, void>({
    mutationFn: () => deleteAccount(authenticatedApiFetch),
    // The query cache is cleared by QueryProvider on sign-out.
    onSuccess: async () => {
      await discardSession(ACCOUNT_DELETED_NOTICE);
    },
  });
}
