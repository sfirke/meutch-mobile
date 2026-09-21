import { useQuery } from '@tanstack/react-query';

import { fetchHasCircles } from '../lib/circles';
import { circleKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

// Circle membership changes rarely, and the probe only exists to disambiguate
// an empty item list, so it can stay fresh for a long while.
const HAS_CIRCLES_STALE_TIME = 10 * 60 * 1000;

export type UseHasCirclesQueryOptions = {
  enabled: boolean;
};

export function useHasCirclesQuery({ enabled }: UseHasCirclesQueryOptions) {
  const { authenticatedApiFetch } = useSession();

  return useQuery({
    queryKey: circleKeys.hasAny(),
    queryFn: ({ signal }) => fetchHasCircles(authenticatedApiFetch, { signal }),
    enabled,
    staleTime: HAS_CIRCLES_STALE_TIME,
  });
}
