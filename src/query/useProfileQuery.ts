import { useQuery } from '@tanstack/react-query';

import { fetchProfile, type UserProfile } from '../lib/profile';
import { profileKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export function useProfileQuery() {
  const { authenticatedApiFetch } = useSession();

  return useQuery<UserProfile>({
    queryKey: profileKeys.me(),
    queryFn: ({ signal }) => fetchProfile(authenticatedApiFetch, { signal }),
  });
}
