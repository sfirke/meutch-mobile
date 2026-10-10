import { useQuery } from '@tanstack/react-query';

import { fetchAllMyCircles, type CircleSummary } from '../lib/circles';
import { circleKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

// Membership changes rarely and the filter sheet reopens often.
const MY_CIRCLES_STALE_TIME = 5 * 60 * 1000;

export type UseMyCirclesQueryOptions = {
  enabled?: boolean;
};

export function useMyCirclesQuery({
  enabled = true,
}: UseMyCirclesQueryOptions = {}) {
  const { authenticatedApiFetch } = useSession();

  return useQuery<CircleSummary[]>({
    queryKey: circleKeys.mineAll(),
    queryFn: ({ signal }) =>
      fetchAllMyCircles(authenticatedApiFetch, { signal }),
    enabled,
    staleTime: MY_CIRCLES_STALE_TIME,
  });
}
