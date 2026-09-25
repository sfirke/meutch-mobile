import { useQuery } from '@tanstack/react-query';

import { fetchItemDetail, type ItemDetailResponse } from '../lib/items';
import { isUuid } from '../lib/parse';
import { itemKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export const isItemId = isUuid;

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
