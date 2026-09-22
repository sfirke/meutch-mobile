import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelJoinRequest } from '../lib/circles';
import { circleKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export function useCancelJoinRequestMutation(id: string) {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelJoinRequest(authenticatedApiFetch, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: circleKeys.all });
    },
  });
}
