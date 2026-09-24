import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateAboutMe, type UserProfile } from '../lib/profile';
import { profileKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export function useUpdateAboutMeMutation() {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<UserProfile, Error, string>({
    mutationFn: (aboutMe: string) =>
      updateAboutMe(authenticatedApiFetch, aboutMe),
    onSuccess: (user) => {
      queryClient.setQueryData(profileKeys.me(), user);
    },
  });
}
