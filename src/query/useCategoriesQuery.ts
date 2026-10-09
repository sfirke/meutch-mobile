import { useQuery } from '@tanstack/react-query';

import { referenceKeys } from '../lib/queryKeys';
import { fetchCategories, type ItemCategory } from '../lib/reference';
import { useSession } from '../session/SessionProvider';

// Categories rarely change, so keep them for a day.
export const CATEGORIES_STALE_TIME = 24 * 60 * 60 * 1000;

export function useCategoriesQuery() {
  const { authenticatedApiFetch } = useSession();

  return useQuery<ItemCategory[]>({
    queryKey: referenceKeys.categories(),
    queryFn: ({ signal }) => fetchCategories(authenticatedApiFetch, { signal }),
    staleTime: CATEGORIES_STALE_TIME,
  });
}
