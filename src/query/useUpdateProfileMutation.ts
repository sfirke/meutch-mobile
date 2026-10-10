import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import {
  updateProfile,
  type ProfileUpdate,
  type ProfileUpdateResult,
} from '../lib/profile';
import { profileKeys, userKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';
import { markItemListsStale } from './itemCacheUpdates';

export function useUpdateProfileMutation(): UseMutationResult<
  ProfileUpdateResult,
  Error,
  ProfileUpdate
> {
  const { authenticatedApiFetch, refreshUser } = useSession();
  const queryClient = useQueryClient();

  return useMutation<ProfileUpdateResult, Error, ProfileUpdate>({
    mutationFn: (update) => updateProfile(authenticatedApiFetch, update),
    onSuccess: (result, update) => {
      queryClient.setQueryData(profileKeys.me(), result.user);
      void queryClient.invalidateQueries({
        queryKey: userKeys.detail(result.user.id),
      });

      // Name and avatar also appear on the session user and on item cards
      // and feed events.
      if (
        update.first_name !== undefined ||
        update.last_name !== undefined ||
        update.photo !== undefined
      ) {
        void refreshUser();
        markItemListsStale(queryClient);
      }
    },
  });
}
