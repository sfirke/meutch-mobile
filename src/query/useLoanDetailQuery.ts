import { useQuery } from '@tanstack/react-query';

import { fetchLoanDetail, type LoanDetailResponse } from '../lib/loans';
import { isUuid } from '../lib/parse';
import { loanKeys } from '../lib/queryKeys';
import { useSession } from '../session/SessionProvider';

export const isLoanId = isUuid;

export function useLoanDetailQuery(id: string | undefined) {
  const { authenticatedApiFetch } = useSession();
  const loanId = id ?? '';

  return useQuery<LoanDetailResponse>({
    queryKey: loanKeys.detail(loanId),
    queryFn: ({ signal }) =>
      fetchLoanDetail(authenticatedApiFetch, loanId, { signal }),
    enabled: isLoanId(id),
  });
}
