import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteItem, type DeleteItemResult } from '../lib/items';
import { itemKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';
import { markItemListsStale } from './itemCacheUpdates';

export type DeleteItemVariables = { id: string };

export function useDeleteItemMutation() {
  const { authenticatedApiFetch } = useSession();
  const queryClient = useQueryClient();

  return useMutation<DeleteItemResult, Error, DeleteItemVariables>({
    mutationFn: ({ id }) => deleteItem(authenticatedApiFetch, id),
    onSuccess: (_result, { id }) => {
      queryClient.removeQueries({ queryKey: itemKeys.detail(id) });
      markItemListsStale(queryClient);
    },
  });
}
