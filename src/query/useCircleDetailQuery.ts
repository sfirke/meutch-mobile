import { useQuery } from '@tanstack/react-query';

import { fetchCircleDetail, type CircleDetail } from '../lib/circles';
import { isUuid } from '../lib/parse';
import { circleKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export function useCircleDetailQuery(id: string | undefined) {
  const { authenticatedApiFetch } = useSession();
  const circleId = id ?? '';

  return useQuery<CircleDetail>({
    queryKey: circleKeys.detail(circleId),
    queryFn: async ({ signal }) => {
      const { circle } = await fetchCircleDetail(
        authenticatedApiFetch,
        circleId,
        { signal },
      );

      return circle;
    },
    enabled: isUuid(id),
  });
}
