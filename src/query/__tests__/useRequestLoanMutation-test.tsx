import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { isApiError } from '../../lib/api';
import { itemKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useRequestLoanMutation } from '../useRequestLoanMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const LOAN_ID = '11111111-1111-4111-8111-111111111111';
const ITEM_ID = '22222222-2222-4222-8222-222222222222';
const MESSAGE_ID = '33333333-3333-4333-8333-333333333333';

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

const INPUT = {
  start_date: '2026-11-01',
  end_date: '2026-11-05',
  message: 'Could I borrow this for a weekend project?',
};

const RESPONSE = {
  loan: {
    id: LOAN_ID,
    status: 'pending',
    start_date: INPUT.start_date,
    end_date: INPUT.end_date,
    item: {
      id: ITEM_ID,
      name: 'Extension ladder',
      available: true,
      image_url: null,
    },
    owner: ana,
    borrower: ben,
    latest_conversation_message_id: MESSAGE_ID,
    due_state: null,
    days_until_due: null,
    days_overdue: null,
    created_at: '2026-10-11T12:00:00',
  },
  message: {
    id: MESSAGE_ID,
    body: INPUT.message,
    timestamp: '2026-10-11T12:00:00+00:00',
    is_read: false,
    sender: ben,
    recipient: ana,
  },
};

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

test('posts the request and invalidates the item detail', async () => {
  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const authenticatedApiFetch = mockApiFetch({
    [`POST /items/${ITEM_ID}/loan-requests`]: (init?: RequestInit) => {
      expect(getRequestBody(init)).toEqual(INPUT);

      return RESPONSE;
    },
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useRequestLoanMutation(ITEM_ID), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync(INPUT);
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(authenticatedApiFetch).toHaveBeenCalledWith(
    `/items/${ITEM_ID}/loan-requests`,
    expect.objectContaining({ method: 'POST' }),
  );
  expect(result.current.data?.loan.id).toBe(LOAN_ID);
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: itemKeys.detail(ITEM_ID),
  });
});

test('a 409 surfaces as an ApiError with the server message', async () => {
  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const authenticatedApiFetch = mockApiFetch({
    [`POST /items/${ITEM_ID}/loan-requests`]: jsonResponse(
      {
        error: {
          code: 'CONFLICT',
          message: 'You already have a pending request for this item.',
        },
      },
      409,
    ),
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useRequestLoanMutation(ITEM_ID), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync(INPUT).catch(() => {});
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  const error = result.current.error;
  expect(isApiError(error)).toBe(true);
  expect(isApiError(error) && error.status).toBe(409);
  expect(error?.message).toBe(
    'You already have a pending request for this item.',
  );
  expect(invalidateSpy).not.toHaveBeenCalled();
});
