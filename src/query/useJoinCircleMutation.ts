import { useMutation, useQueryClient } from '@tanstack/react-query';

import { joinCircle, type JoinCircleResponse } from '../lib/circles';
import { circleKeys, feedKeys, itemKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

/**
 * Joining or requesting to join changes every circle query. Becoming a member
 * also opens up that circle's items and activity, so Browse and Feed refetch.
 */
export function useJoinCircleMutation(id: string) {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<JoinCircleResponse, unknown, string | undefined>({
    mutationFn: (message?: string) =>
      joinCircle(authenticatedApiFetch, id, { message }),
    onSuccess: ({ membership_status }) => {
      queryClient.invalidateQueries({ queryKey: circleKeys.all });

      if (membership_status === 'member') {
        queryClient.invalidateQueries({ queryKey: feedKeys.all });
        queryClient.invalidateQueries({ queryKey: itemKeys.all });
      }
    },
  });
}
