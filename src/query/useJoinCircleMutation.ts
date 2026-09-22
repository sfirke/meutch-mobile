import { useMutation, useQueryClient } from '@tanstack/react-query';

import { joinCircle, type JoinCircleResponse } from '../lib/circles';
import { circleKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

/** Joining or requesting to join unblocks Browse's empty state, so all circle queries refresh. */
export function useJoinCircleMutation(id: string) {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<JoinCircleResponse, unknown, string | undefined>({
    mutationFn: (message?: string) =>
      joinCircle(authenticatedApiFetch, id, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: circleKeys.all });
    },
  });
}
