import { useQuery } from '@tanstack/react-query';

import { fetchUserProfile, type UserProfileResponse } from '../lib/users';
import { isUuid } from '../lib/parse';
import { userKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export function useUserProfileQuery(id: string | undefined) {
  const { authenticatedApiFetch } = useSession();
  const userId = id ?? '';

  return useQuery<UserProfileResponse>({
    queryKey: userKeys.detail(userId),
    queryFn: ({ signal }) =>
      fetchUserProfile(authenticatedApiFetch, userId, { signal }),
    enabled: isUuid(id),
  });
}
