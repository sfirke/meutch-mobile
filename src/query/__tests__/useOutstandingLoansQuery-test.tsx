import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import type { LoanActivity } from '../../lib/loans';
import { loanKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  jsonResponse,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useOutstandingLoansQuery } from '../useOutstandingLoansQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

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

function page(loans: LoanActivity[]): unknown {
  return {
    loans,
    pagination: {
      page: 1,
      per_page: 50,
      total: loans.length,
      pages: 1,
      has_next: false,
      has_prev: false,
    },
  };
}

const BORROWING = 'GET /me/loans?role=borrowing&status=all&page=1&per_page=50';
const LENDING = 'GET /me/loans?role=lending&status=all&page=1&per_page=50';

function setup(routes: Parameters<typeof mockApiFetch>[0]) {
  mockSession({ authenticatedApiFetch: mockApiFetch(routes) });

  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
}

describe('useOutstandingLoansQuery', () => {
  test('resolves counts and caches under the summary key', async () => {
    const { queryClient, wrapper } = setup({
      [BORROWING]: page([
        loan('loan-1', { due_state: 'overdue', days_overdue: 4 }),
      ]),
      [LENDING]: page([loan('loan-2', { status: 'pending' })]),
    });

    const { result } = renderHook(() => useOutstandingLoansQuery(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      activeBorrowing: 1,
      activeLending: 0,
      pendingBorrowing: 0,
      pendingLending: 1,
      hasOutstanding: true,
    });
    expect(queryClient.getQueryData(loanKeys.summary())).toEqual(
      result.current.data,
    );
  });

  test('surfaces a server error', async () => {
    const { wrapper } = setup({
      [BORROWING]: jsonResponse(
        { error: { code: 'SERVER_ERROR', message: 'Boom.' } },
        500,
      ),
      [LENDING]: page([]),
    });

    const { result } = renderHook(() => useOutstandingLoansQuery(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
