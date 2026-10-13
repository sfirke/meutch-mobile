import { buildJsonRequestInit, readJsonOrThrow, type ApiFetch } from './api';
import { fetchMyLoans, type LoanActivity, type LoanRole } from './loans';
import { isObject } from './parse';

export const DELETE_CONFIRMATION = 'DELETE MY ACCOUNT';

export async function deleteAccount(fetchImpl: ApiFetch): Promise<void> {
  const response = await fetchImpl(
    '/me',
    buildJsonRequestInit(
      { confirmation: DELETE_CONFIRMATION },
      { method: 'DELETE' },
    ),
  );
  const payload = await readJsonOrThrow<unknown>(response);

  if (!isObject(payload) || payload.deleted !== true) {
    throw new Error('Invalid delete account payload.');
  }
}

export type OutstandingLoans = {
  activeBorrowing: number;
  activeLending: number;
  pendingBorrowing: number;
  pendingLending: number;
  hasOutstanding: boolean;
};

function countByStatus(loans: LoanActivity[], status: 'approved' | 'pending') {
  return loans.filter((loan) => loan.status === status).length;
}

/** Approved loans count as active even when overdue, matching the website. */
export function countOutstanding(
  borrowing: LoanActivity[],
  lending: LoanActivity[],
): OutstandingLoans {
  const activeBorrowing = countByStatus(borrowing, 'approved');
  const activeLending = countByStatus(lending, 'approved');
  const pendingBorrowing = countByStatus(borrowing, 'pending');
  const pendingLending = countByStatus(lending, 'pending');

  return {
    activeBorrowing,
    activeLending,
    pendingBorrowing,
    pendingLending,
    hasOutstanding:
      activeBorrowing + activeLending + pendingBorrowing + pendingLending > 0,
  };
}

export const OUTSTANDING_LOANS_PER_PAGE = 50;
// A guard against runaway paging, not a correctness bound.
export const OUTSTANDING_LOANS_MAX_PAGES = 5;

async function fetchAllLoans(
  fetchImpl: ApiFetch,
  role: LoanRole,
  signal: AbortSignal | undefined,
): Promise<LoanActivity[]> {
  const loans: LoanActivity[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= OUTSTANDING_LOANS_MAX_PAGES; page += 1) {
    const result = await fetchMyLoans(fetchImpl, {
      role,
      page,
      perPage: OUTSTANDING_LOANS_PER_PAGE,
      signal,
    });

    for (const loan of result.loans) {
      if (!seenIds.has(loan.id)) {
        seenIds.add(loan.id);
        loans.push(loan);
      }
    }

    if (!result.pagination.has_next) {
      break;
    }
  }

  return loans;
}

export async function fetchOutstandingLoans(
  fetchImpl: ApiFetch,
  options?: { signal?: AbortSignal },
): Promise<OutstandingLoans> {
  const [borrowing, lending] = await Promise.all([
    fetchAllLoans(fetchImpl, 'borrowing', options?.signal),
    fetchAllLoans(fetchImpl, 'lending', options?.signal),
  ]);

  return countOutstanding(borrowing, lending);
}
