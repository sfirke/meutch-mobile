import { useQuery } from '@tanstack/react-query';

import { fetchUnreadCount } from '../lib/messages';
import { messageKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

const POLL_INTERVAL_MS = 60 * 1000;

/**
 * Unread received messages, the same count as the web navbar. Polls once a
 * minute while the app is in the foreground, and 0 until the first response.
 */
export function useInboxUnreadCount(): number {
  const { authenticatedApiFetch, status } = useSession();

  const { data } = useQuery({
    queryKey: messageKeys.unreadCount(),
    queryFn: ({ signal }) =>
      fetchUnreadCount(authenticatedApiFetch, { signal }),
    enabled: status === 'signed-in',
    refetchInterval: POLL_INTERVAL_MS,
  });

  return data ?? 0;
}
