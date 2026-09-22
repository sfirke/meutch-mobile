import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { isApiError } from '../../lib/api';
import {
  createTestQueryClient,
  jsonResponse,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useThreadQuery } from '../useThreadQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const MESSAGE_ID = 'a1111111-1111-4111-8111-111111111111';

const otherUser = {
  id: 'b2222222-2222-4222-8222-222222222222',
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
};

const viewer = {
  id: 'c3333333-3333-4333-8333-333333333333',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
};

function createThread() {
  return {
    conversation_id: 'd4444444-4444-4444-8444-444444444444',
    other_user: otherUser,
    shared_circles: [
      {
        id: 'e5555555-5555-4555-8555-555555555555',
        name: 'Oak Street',
        circle_type: 'neighborhood',
        image_url: null,
      },
    ],
    item: {
      id: 'f6666666-6666-4666-8666-666666666666',
      name: 'Cordless drill',
      image_url: null,
    },
    item_request: null,
    circle: null,
    active_loan: null,
    has_unread_messages: true,
    messages: [
      {
        id: MESSAGE_ID,
        body: 'Is this still available?',
        timestamp: '2026-05-26T18:30:00+00:00',
        is_read: false,
        sender: otherUser,
        recipient: viewer,
      },
    ],
  };
}

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

test('fetches a thread by its anchor message id', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    [`GET /messages/${MESSAGE_ID}`]: createThread(),
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useThreadQuery(MESSAGE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.messages).toHaveLength(1);
  expect(result.current.data?.context).toEqual({
    kind: 'item',
    item: {
      id: 'f6666666-6666-4666-8666-666666666666',
      name: 'Cordless drill',
      image_url: null,
    },
  });
  expect(result.current.data?.other_user.full_name).toBe('Morgan Member');
});

test('does not fetch for a non-UUID message id', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({});

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useThreadQuery('not-a-uuid'), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isPending).toBe(true));
  expect(authenticatedApiFetch).not.toHaveBeenCalled();
});

test('does not fetch for an undefined message id', () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({});

  mockSession({ authenticatedApiFetch });

  renderHook(() => useThreadQuery(undefined), {
    wrapper: createWrapper(queryClient),
  });

  expect(authenticatedApiFetch).not.toHaveBeenCalled();
});

test('exposes a 403 as an ApiError', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    [`GET /messages/${MESSAGE_ID}`]: jsonResponse(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'You are not part of this conversation.',
        },
      },
      403,
    ),
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useThreadQuery(MESSAGE_ID), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(isApiError(result.current.error) && result.current.error.code).toBe(
    'FORBIDDEN',
  );
});
