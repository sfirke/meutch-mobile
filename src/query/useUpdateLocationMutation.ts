import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  removeLocation,
  updateLocationByAddress,
  updateLocationByCoordinates,
  type AddressInput,
  type Coordinates,
  type LocationUpdateResult,
} from '../lib/location';
import { type UserProfile } from '../lib/profile';
import { circleKeys, profileKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';
import { markItemListsStale } from './itemCacheUpdates';

export type LocationMutationInput = AddressInput | Coordinates | 'remove';

export function useUpdateLocationMutation() {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<LocationUpdateResult, Error, LocationMutationInput>({
    mutationFn: (input) => {
      if (input === 'remove') {
        return removeLocation(authenticatedApiFetch);
      }

      return 'latitude' in input
        ? updateLocationByCoordinates(authenticatedApiFetch, input)
        : updateLocationByAddress(authenticatedApiFetch, input);
    },
    onSuccess: (result) => {
      // The backend answers 200 for every status; the flags are current state.
      queryClient.setQueryData<UserProfile>(profileKeys.me(), (current) =>
        current
          ? {
              ...current,
              has_location: result.user.has_location,
              geocoding_failed: result.user.geocoding_failed,
            }
          : current,
      );

      if (result.status === 'success' || result.status === 'removed') {
        // Distances in item, feed and circle lists depend on the location.
        markItemListsStale(queryClient);
        void queryClient.invalidateQueries({
          queryKey: circleKeys.all,
          refetchType: 'none',
        });
      }
    },
  });
}
