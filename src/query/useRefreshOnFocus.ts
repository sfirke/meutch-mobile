import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Refetches a screen's stale queries when the screen regains focus, since
 * stack and tab screens stay mounted underneath. Mounting already fetches, so
 * the first focus is skipped. `queryKey` must be stable across renders.
 */
export function useRefreshOnFocus(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }

      void queryClient.refetchQueries({
        queryKey,
        stale: true,
        type: 'active',
      });
    }, [queryClient, queryKey]),
  );
}
