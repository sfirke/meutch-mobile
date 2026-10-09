import { useQuery } from '@tanstack/react-query';

import { referenceKeys } from '../lib/queryKeys';
import { fetchTags, type ItemTag } from '../lib/reference';
import { useSession } from '../session/SessionProvider';

// Tags rarely change, so keep them for a day.
export const TAGS_STALE_TIME = 24 * 60 * 60 * 1000;

export function useTagsQuery() {
  const { authenticatedApiFetch } = useSession();

  return useQuery<ItemTag[]>({
    queryKey: referenceKeys.tags(),
    queryFn: ({ signal }) => fetchTags(authenticatedApiFetch, { signal }),
    staleTime: TAGS_STALE_TIME,
  });
}
