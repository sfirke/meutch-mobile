import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { LoanRole } from '../../lib/loans';
import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useMyLoansQuery } from '../useMyLoansQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const LOAN_A = 'a1111111-1111-4111-8111-111111111111';
const LOAN_B = 'b2222222-2222-4222-8222-222222222222';
const LOAN_C = 'c3333333-3333-4333-8333-333333333333';

function createLoan(id: string, overrides?: Record<string, unknown>) {
  return {
    id,
    status: 'approved',
    start_date: '2026-02-01',
    end_date: '2026-02-08',
    item: {
      id: 'd4444444-4444-4444-8444-444444444444',
      name: 'Cordless drill',
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

function pagination(page: number, hasNext: boolean) {
  return {
    page,
    per_page: 2,
    total: 3,
    pages: 2,
    has_next: hasNext,
    has_prev: page > 1,
  };
}

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

test('appends the next page in order', async () => {
  const authenticatedApiFetch = mockApiFetch({
    'GET /me/loans?role=borrowing&status=all&page=1': {
      loans: [createLoan(LOAN_A), createLoan(LOAN_B)],
      pagination: pagination(1, true),
    },
    'GET /me/loans?role=borrowing&status=all&page=2': {
      loans: [createLoan(LOAN_C)],
      pagination: pagination(2, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useMyLoansQuery('borrowing'), {
    wrapper: createWrapper(createTestQueryClient()),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(true);

  await result.current.fetchNextPage();
  await waitFor(() => expect(result.current.loans).toHaveLength(3));

  expect(result.current.loans.map((loan) => loan.id)).toEqual([
    LOAN_A,
    LOAN_B,
    LOAN_C,
  ]);
  expect(result.current.hasNextPage).toBe(false);
});

test('dedupes loans that repeat across pages', async () => {
  const authenticatedApiFetch = mockApiFetch({
    'GET /me/loans?role=borrowing&status=all&page=1': {
      loans: [createLoan(LOAN_A), createLoan(LOAN_B)],
      pagination: pagination(1, true),
    },
    'GET /me/loans?role=borrowing&status=all&page=2': {
      loans: [createLoan(LOAN_B), createLoan(LOAN_C)],
      pagination: pagination(2, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useMyLoansQuery('borrowing'), {
    wrapper: createWrapper(createTestQueryClient()),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await result.current.fetchNextPage();
  await waitFor(() => expect(result.current.loans).toHaveLength(3));

  expect(result.current.loans.map((loan) => loan.id)).toEqual([
    LOAN_A,
    LOAN_B,
    LOAN_C,
  ]);
});

test('sends the role and issues a new request when it changes', async () => {
  const authenticatedApiFetch = mockApiFetch({
    'GET /me/loans?role=borrowing&status=all&page=1': {
      loans: [createLoan(LOAN_A)],
      pagination: pagination(1, false),
    },
    'GET /me/loans?role=lending&status=all&page=1': {
      loans: [createLoan(LOAN_B)],
      pagination: pagination(1, false),
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result, rerender } = renderHook(
    ({ role }: { role: LoanRole }) => useMyLoansQuery(role),
    {
      wrapper: createWrapper(createTestQueryClient()),
      initialProps: { role: 'borrowing' as LoanRole },
    },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.loans.map((loan) => loan.id)).toEqual([LOAN_A]);

  rerender({ role: 'lending' });

  await waitFor(() =>
    expect(result.current.loans.map((loan) => loan.id)).toEqual([LOAN_B]),
  );
  expect(authenticatedApiFetch.mock.calls.map(([path]) => path)).toEqual([
    '/me/loans?role=borrowing&status=all&page=1',
    '/me/loans?role=lending&status=all&page=1',
  ]);
});
