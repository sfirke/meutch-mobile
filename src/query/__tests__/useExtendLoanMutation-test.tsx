import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { isApiError } from '../../lib/api';
import {
  createTestQueryClient,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { invalidateLoanCaches } from '../loanCacheUpdates';
import { useExtendLoanMutation } from '../useExtendLoanMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));
jest.mock('../loanCacheUpdates', () => ({ invalidateLoanCaches: jest.fn() }));

const LOAN_ID = '11111111-1111-4111-8111-111111111111';
const ITEM_ID = '22222222-2222-4222-8222-222222222222';
const MESSAGE_ID = '33333333-3333-4333-8333-333333333333';
const EXTEND_ROUTE = `POST /loans/${LOAN_ID}/extend`;

const ana = {
  id: '44444444-4444-4444-8444-444444444444',
  first_name: 'Ana',
  last_name: 'Example',
  full_name: 'Ana Example',
  profile_image_url: null,
  profile_viewable: true,
};

const ben = {
  ...ana,
  id: '55555555-5555-4555-8555-555555555555',
  first_name: 'Ben',
  full_name: 'Ben Example',
};

function buildExtendPayload(endDate: string) {
  return {
    loan: {
      id: LOAN_ID,
      status: 'approved',
      start_date: '2026-06-01',
      end_date: endDate,
      item: {
        id: ITEM_ID,
        name: 'Extension ladder',
        available: false,
        image_url: null,
      },
      owner: ana,
      borrower: ben,
      latest_conversation_message_id: MESSAGE_ID,
      due_state: null,
      days_until_due: null,
      days_overdue: null,
      created_at: '2026-05-30T12:00:00',
    },
    message: {
      id: MESSAGE_ID,
      body: 'Due date changed.',
      timestamp: '2026-05-30T12:00:00+00:00',
      is_read: false,
      sender: ana,
      recipient: ben,
    },
    is_extension: true,
  };
}

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function renderExtendHook(
  authenticatedApiFetch: ReturnType<typeof mockApiFetch>,
) {
  const queryClient = createTestQueryClient();

  mockSession({ authenticatedApiFetch });

  const rendered = renderHook(() => useExtendLoanMutation(LOAN_ID), {
    wrapper: createWrapper(queryClient),
  });

  return { ...rendered, queryClient };
}

beforeEach(() => {
  jest.mocked(invalidateLoanCaches).mockClear();
});

test('posts the new date and refreshes the loan caches', async () => {
  const authenticatedApiFetch = mockApiFetch({
    [EXTEND_ROUTE]: buildExtendPayload('2026-06-20'),
  });
  const { result, queryClient } = renderExtendHook(authenticatedApiFetch);

  await act(async () => {
    await result.current.mutateAsync({ new_end_date: '2026-06-20' });
  });

  expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
  const [path, init] = authenticatedApiFetch.mock.calls[0];
  expect(path).toBe(`/loans/${LOAN_ID}/extend`);
  expect(init?.method).toBe('POST');
  expect(getRequestBody(init)).toEqual({ new_end_date: '2026-06-20' });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.is_extension).toBe(true);
  expect(result.current.data?.loan.end_date).toBe('2026-06-20');
  expect(invalidateLoanCaches).toHaveBeenCalledWith(
    queryClient,
    result.current.data?.loan,
  );
});

test('includes the message when one is given', async () => {
  const authenticatedApiFetch = mockApiFetch({
    [EXTEND_ROUTE]: buildExtendPayload('2026-06-20'),
  });
  const { result } = renderExtendHook(authenticatedApiFetch);

  await act(async () => {
    await result.current.mutateAsync({
      new_end_date: '2026-06-20',
      message: 'Keep it a bit longer.',
    });
  });

  expect(getRequestBody(authenticatedApiFetch.mock.calls[0][1])).toEqual({
    new_end_date: '2026-06-20',
    message: 'Keep it a bit longer.',
  });
});

test('a 403 exposes the server message and skips the cache update', async () => {
  const authenticatedApiFetch = mockApiFetch({
    [EXTEND_ROUTE]: jsonResponse(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Only the owner can change the due date.',
        },
      },
      403,
    ),
  });
  const { result } = renderExtendHook(authenticatedApiFetch);

  await act(async () => {
    await result.current
      .mutateAsync({ new_end_date: '2026-06-20' })
      .catch(() => {});
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  const { error } = result.current;
  expect(isApiError(error) && error.status).toBe(403);
  expect(error?.message).toBe('Only the owner can change the due date.');
  expect(invalidateLoanCaches).not.toHaveBeenCalled();
});
