import { useQuery } from '@tanstack/react-query';

import { fetchItemDetail, type ItemDetailResponse } from '../lib/items';
import { itemKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A deep link can carry anything, and the backend route only matches a UUID.
 * Checking here keeps a junk id from costing a request (and a rate-limit hit).
 */
export function isItemId(value: string | undefined): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function useItemDetailQuery(id: string | undefined) {
  const { authenticatedApiFetch } = useSession();
  const itemId = id ?? '';

  return useQuery<ItemDetailResponse>({
    queryKey: itemKeys.detail(itemId),
    queryFn: ({ signal }) =>
      fetchItemDetail(authenticatedApiFetch, itemId, { signal }),
    enabled: isItemId(id),
  });
}
