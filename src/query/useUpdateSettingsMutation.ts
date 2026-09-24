import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateSettings, type UserSettings } from '../lib/profile';
import { profileKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export function useUpdateSettingsMutation() {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<UserSettings, Error, UserSettings>({
    mutationFn: (settings: UserSettings) =>
      updateSettings(authenticatedApiFetch, settings),
    onSuccess: (settings) => {
      queryClient.setQueryData(profileKeys.settings(), settings);
    },
  });
}
