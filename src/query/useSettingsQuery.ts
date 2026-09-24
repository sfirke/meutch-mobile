import { useQuery } from '@tanstack/react-query';

import { fetchSettings, type UserSettings } from '../lib/profile';
import { profileKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export function useSettingsQuery() {
  const { authenticatedApiFetch } = useSession();

  return useQuery<UserSettings>({
    queryKey: profileKeys.settings(),
    queryFn: ({ signal }) => fetchSettings(authenticatedApiFetch, { signal }),
  });
}
