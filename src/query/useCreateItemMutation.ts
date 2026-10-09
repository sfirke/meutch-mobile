import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createItem,
  type ItemDetailResponse,
  type ItemWriteInput,
} from '../lib/items';
import { itemKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';
import { markItemListsStale } from './itemCacheUpdates';

export type CreateItemVariables = {
  input: ItemWriteInput;
  creationToken: string;
};

export function useCreateItemMutation() {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<ItemDetailResponse, Error, CreateItemVariables>({
    mutationFn: ({ input, creationToken }) =>
      createItem(authenticatedApiFetch, input, creationToken),
    onSuccess: (response) => {
      const detailKey = itemKeys.detail(response.item.id);

      queryClient.setQueryData(detailKey, response);
      markItemListsStale(queryClient, detailKey);
    },
  });
}
