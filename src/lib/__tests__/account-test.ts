import {
  countOutstanding,
  DELETE_CONFIRMATION,
  deleteAccount,
  fetchOutstandingLoans,
  OUTSTANDING_LOANS_MAX_PAGES,
} from '../account';
import type { LoanActivity } from '../loans';
import {
  getRequestBody,
  jsonResponse,
  mockApiFetch,
} from '../../test-utils/renderWithProviders';

function loan(id: string, overrides?: Partial<LoanActivity>): LoanActivity {
  return {
    id,
    status: 'approved',
    start_date: '2026-06-01',
    end_date: '2026-06-10',
    item: {
      id: `item-${id}`,
      name: 'Extension ladder',
      available: false,
      image_url: null,
    },
    owner: null,
    borrower: null,
    latest_conversation_message_id: null,
    due_state: 'on_time',
    days_until_due: 3,
    days_overdue: null,
    ...overrides,
  };
}

function page(
  loans: LoanActivity[],
  pageNumber: number,
  hasNext: boolean,
): unknown {
  return {
    loans,
    pagination: {
      page: pageNumber,
      per_page: 50,
      total: loans.length,
      pages: hasNext ? pageNumber + 1 : pageNumber,
      has_next: hasNext,
      has_prev: pageNumber > 1,
    },
  };
}

const BORROWING_P1 =
  'GET /me/loans?role=borrowing&status=all&page=1&per_page=50';
const BORROWING_P2 =
  'GET /me/loans?role=borrowing&status=all&page=2&per_page=50';
const LENDING_P1 = 'GET /me/loans?role=lending&status=all&page=1&per_page=50';

describe('deleteAccount', () => {
  it('sends DELETE /me with the confirmation and resolves', async () => {
    const fetchImpl = mockApiFetch({ 'DELETE /me': { deleted: true } });

    await expect(deleteAccount(fetchImpl)).resolves.toBeUndefined();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [path, init] = fetchImpl.mock.calls[0];
    expect(path).toBe('/me');
    expect(init?.method).toBe('DELETE');
    expect(getRequestBody(init)).toEqual({
      confirmation: 'DELETE MY ACCOUNT',
    });
    expect(DELETE_CONFIRMATION).toBe('DELETE MY ACCOUNT');
  });

  it('rejects when deleted is not true', async () => {
    const fetchImpl = mockApiFetch({ 'DELETE /me': { deleted: false } });

    await expect(deleteAccount(fetchImpl)).rejects.toThrow(
      'Invalid delete account payload.',
    );
  });

  it('rejects on a 422 response', async () => {
    const fetchImpl = mockApiFetch({
      'DELETE /me': jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed.',
            details: { confirmation: ['Wrong text.'] },
          },
        },
        422,
      ),
    });

    await expect(deleteAccount(fetchImpl)).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
    });
  });
});

describe('countOutstanding', () => {
  it('counts overdue approved loans as active and pending by role', () => {
    const result = countOutstanding(
      [
        loan('loan-1', { due_state: 'overdue', days_overdue: 4 }),
        loan('loan-2', { status: 'pending' }),
      ],
      [loan('loan-3'), loan('loan-4', { status: 'pending' }), loan('loan-5')],
    );

    expect(result).toEqual({
      activeBorrowing: 1,
      activeLending: 2,
      pendingBorrowing: 1,
      pendingLending: 1,
      hasOutstanding: true,
    });
  });

  it('ignores other statuses and reports none outstanding', () => {
    const result = countOutstanding(
      [loan('loan-1', { status: 'canceled' as LoanActivity['status'] })],
      [loan('loan-2', { status: null })],
    );

    expect(result).toEqual({
      activeBorrowing: 0,
      activeLending: 0,
      pendingBorrowing: 0,
      pendingLending: 0,
      hasOutstanding: false,
    });
  });
});

describe('fetchOutstandingLoans', () => {
  it('requests both roles, follows has_next, and dedupes ids', async () => {
    const signal = new AbortController().signal;
    const fetchImpl = mockApiFetch({
      [BORROWING_P1]: page([loan('loan-1'), loan('loan-2')], 1, true),
      [BORROWING_P2]: page(
        [loan('loan-2'), loan('loan-3', { status: 'pending' })],
        2,
        false,
      ),
      [LENDING_P1]: page([loan('loan-4')], 1, false),
    });

    const result = await fetchOutstandingLoans(fetchImpl, { signal });

    expect(result).toEqual({
      activeBorrowing: 2,
      activeLending: 1,
      pendingBorrowing: 1,
      pendingLending: 0,
      hasOutstanding: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init?.signal).toBe(signal);
    }
  });

  it('stops at the page cap when has_next never turns false', async () => {
    let borrowingCalls = 0;
    const fetchImpl = mockApiFetch({
      'GET /me/loans': () => {
        borrowingCalls += 1;
        return page([loan(`loan-${borrowingCalls}`)], borrowingCalls, true);
      },
      [LENDING_P1]: page([], 1, false),
    });

    const result = await fetchOutstandingLoans(fetchImpl);

    expect(borrowingCalls).toBe(OUTSTANDING_LOANS_MAX_PAGES);
    expect(result.activeBorrowing).toBe(OUTSTANDING_LOANS_MAX_PAGES);
  });
});
