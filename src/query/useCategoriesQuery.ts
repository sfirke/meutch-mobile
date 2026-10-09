import { useQuery } from '@tanstack/react-query';

import { fetchCategories } from '../lib/categories';
import type { ItemCategory } from '../lib/items';
import { categoryKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

// Categories change rarely and the filter sheet reopens often.
const CATEGORIES_STALE_TIME = 5 * 60 * 1000;

export type UseCategoriesQueryOptions = {
  enabled?: boolean;
};

export function useCategoriesQuery({
  enabled = true,
}: UseCategoriesQueryOptions = {}) {
  const { authenticatedApiFetch } = useSession();

  return useQuery<ItemCategory[]>({
    queryKey: categoryKeys.list(),
    queryFn: ({ signal }) => fetchCategories(authenticatedApiFetch, { signal }),
    enabled,
    staleTime: CATEGORIES_STALE_TIME,
  });
}
