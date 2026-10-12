import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { isApiError } from '../../lib/api';
import {
  createTestQueryClient,
  jsonResponse,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { invalidateLoanCaches } from '../loanCacheUpdates';
import { useExtensionDecisionMutation } from '../useExtensionDecisionMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));
jest.mock('../loanCacheUpdates', () => ({ invalidateLoanCaches: jest.fn() }));

const LOAN_ID = '11111111-1111-4111-8111-111111111111';
const ITEM_ID = '22222222-2222-4222-8222-222222222222';
const MESSAGE_ID = '33333333-3333-4333-8333-333333333333';
const EXTENSION_ID = '66666666-6666-4666-8666-666666666666';

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

function buildMutationPayload(extension: Record<string, unknown> | null) {
  return {
    loan: {
      id: LOAN_ID,
      status: 'approved',
      start_date: '2026-06-01',
      end_date: '2026-06-10',
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
      pending_extension_request: extension,
      created_at: '2026-05-30T12:00:00',
    },
    message: {
      id: MESSAGE_ID,
      body: 'Loan updated.',
      timestamp: '2026-05-30T12:00:00+00:00',
      is_read: false,
      sender: ana,
      recipient: ben,
      loan_extension_request: extension,
    },
  };
}

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function renderHookUnderTest(
  authenticatedApiFetch: ReturnType<typeof mockApiFetch>,
) {
  const queryClient = createTestQueryClient();

  mockSession({ authenticatedApiFetch });

  const rendered = renderHook(() => useExtensionDecisionMutation(), {
    wrapper: createWrapper(queryClient),
  });

  return { ...rendered, queryClient };
}

beforeEach(() => {
  jest.mocked(invalidateLoanCaches).mockClear();
});

test.each(['approve', 'deny'] as const)(
  '%s posts with no body and refreshes the loan caches',
  async (decision) => {
    const authenticatedApiFetch = mockApiFetch({
      [`POST /loan-extension-requests/${EXTENSION_ID}/${decision}`]:
        buildMutationPayload(null),
    });
    const { result, queryClient } = renderHookUnderTest(authenticatedApiFetch);

    await act(async () => {
      await result.current.mutateAsync({ extensionId: EXTENSION_ID, decision });
    });

    expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
    const [path, init] = authenticatedApiFetch.mock.calls[0];
    expect(path).toBe(`/loan-extension-requests/${EXTENSION_ID}/${decision}`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.loan.pending_extension_request).toBeNull();
    expect(invalidateLoanCaches).toHaveBeenCalledWith(
      queryClient,
      result.current.data?.loan,
    );
  },
);

test('a 409 exposes the ApiError and skips the cache update', async () => {
  const authenticatedApiFetch = mockApiFetch({
    [`POST /loan-extension-requests/${EXTENSION_ID}/approve`]: jsonResponse(
      {
        error: {
          code: 'CONFLICT',
          message: 'This extension request has already been processed.',
        },
      },
      409,
    ),
  });
  const { result } = renderHookUnderTest(authenticatedApiFetch);

  await act(async () => {
    await result.current
      .mutateAsync({ extensionId: EXTENSION_ID, decision: 'approve' })
      .catch(() => {});
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  const { error } = result.current;
  expect(isApiError(error)).toBe(true);
  expect(isApiError(error) && error.status).toBe(409);
  expect(error?.message).toBe(
    'This extension request has already been processed.',
  );
  expect(invalidateLoanCaches).not.toHaveBeenCalled();
});
