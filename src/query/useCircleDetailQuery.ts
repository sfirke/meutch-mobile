import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchCircleDetail, type CircleDetail } from '../lib/circles';
import { isUuid } from '../lib/parse';
import { circleKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

/**
 * Infinite `GET /circles/<id>`, one page per `members_page`. `circle` is the
 * first page's header with every loaded page's members, de-duplicated since
 * offset paging can repeat a member as others join or leave.
 */
export function useCircleDetailQuery(id: string | undefined) {
  const { authenticatedApiFetch } = useSession();
  const circleId = id ?? '';

  const query = useInfiniteQuery({
    queryKey: circleKeys.detail(circleId),
    queryFn: async ({ pageParam, signal }) => {
      const { circle } = await fetchCircleDetail(
        authenticatedApiFetch,
        circleId,
        { membersPage: pageParam, signal },
      );

      return circle;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: CircleDetail): number | undefined =>
      lastPage.members_page < lastPage.members_pages
        ? lastPage.members_page + 1
        : undefined,
    enabled: isUuid(id),
  });

  const circle = useMemo((): CircleDetail | undefined => {
    const pages = query.data?.pages;

    if (!pages || pages.length === 0) {
      return undefined;
    }

    const seen = new Set<string>();
    const members = pages
      .flatMap((page) => page.members)
      .filter((member) => {
        if (seen.has(member.user.id)) {
          return false;
        }

        seen.add(member.user.id);
        return true;
      });

    return {
      ...pages[0],
      members,
      members_page: pages[pages.length - 1].members_page,
    };
  }, [query.data]);

  return { ...query, circle };
}
