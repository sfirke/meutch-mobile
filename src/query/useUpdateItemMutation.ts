import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  updateItem,
  type ItemDetailResponse,
  type ItemWriteInput,
} from '../lib/items';
import type { PhotoChanges } from '../lib/itemPhotos';
import { itemKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';
import { markItemListsStale } from './itemCacheUpdates';

export type UpdateItemVariables = {
  id: string;
  input: ItemWriteInput;
  changes?: PhotoChanges;
};

export function useUpdateItemMutation() {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<ItemDetailResponse, Error, UpdateItemVariables>({
    mutationFn: ({ id, input, changes }) =>
      updateItem(authenticatedApiFetch, id, input, changes),
    onSuccess: (response) => {
      const detailKey = itemKeys.detail(response.item.id);

      queryClient.setQueryData(detailKey, response);
      markItemListsStale(queryClient, detailKey);
    },
  });
}
