import { useQuery } from '@tanstack/react-query';

import { isUuid } from '../lib/parse';
import { requestKeys } from '../lib/queryKeys';
import {
  fetchRequestDetail,
  type RequestDetailResponse,
} from '../lib/requests';
import { useSession } from '../session/SessionProvider';

export const isRequestId = isUuid;

export function useRequestDetailQuery(id: string | undefined) {
  const { authenticatedApiFetch } = useSession();
  const requestId = id ?? '';

  return useQuery<RequestDetailResponse>({
    queryKey: requestKeys.detail(requestId),
    queryFn: ({ signal }) =>
      fetchRequestDetail(authenticatedApiFetch, requestId, { signal }),
    enabled: isRequestId(id),
  });
}
