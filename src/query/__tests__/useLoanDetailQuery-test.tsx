import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useLoanDetailQuery } from '../useLoanDetailQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const LOAN_ID = 'a1111111-1111-4111-8111-111111111111';

function createUser(id: string, firstName: string, lastName: string) {
  return {
    id,
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`,
    profile_image_url: null,
    profile_viewable: true,
  };
}

function createLoanDetail() {
  return {
    id: LOAN_ID,
    status: 'approved',
    start_date: '2026-06-01',
    end_date: '2026-06-08',
    item: {
      id: 'b1111111-1111-4111-8111-111111111111',
      name: 'Fake Ladder',
      available: false,
      image_url: null,
    },
    owner: createUser(
      'c1111111-1111-4111-8111-111111111111',
      'Owen',
      'Example',
    ),
    borrower: createUser(
      'd1111111-1111-4111-8111-111111111111',
      'Bea',
      'Sample',
    ),
    latest_conversation_message_id: null,
    due_state: 'on_time',
    days_until_due: 3,
    days_overdue: null,
    created_at: '2026-05-30T12:00:00+00:00',
  };
}

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

test('fetches and unwraps a loan detail', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    [`GET /loans/${LOAN_ID}`]: { loan: createLoanDetail() },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useLoanDetailQuery(LOAN_ID), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(authenticatedApiFetch).toHaveBeenCalledWith(
    `/loans/${LOAN_ID}`,
    expect.anything(),
  );
  expect(result.current.data?.loan.id).toBe(LOAN_ID);
  expect(result.current.data?.loan.item.name).toBe('Fake Ladder');
  expect(result.current.data?.loan.owner?.full_name).toBe('Owen Example');
  expect(result.current.data?.loan.days_until_due).toBe(3);
});

test('does not fetch for a non-UUID id', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({});

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useLoanDetailQuery('not-a-loan'), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isPending).toBe(true));
  expect(result.current.fetchStatus).toBe('idle');
  expect(authenticatedApiFetch).not.toHaveBeenCalled();
});

test('does not fetch for an undefined id', () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({});

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useLoanDetailQuery(undefined), {
    wrapper: createWrapper(queryClient),
  });

  expect(result.current.fetchStatus).toBe('idle');
  expect(authenticatedApiFetch).not.toHaveBeenCalled();
});
