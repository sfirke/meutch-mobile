import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { ConversationSubject } from '../../lib/messages';
import { itemKeys, messageKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  jsonResponse,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useStartConversationMutation } from '../useStartConversationMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const ITEM_ID = 'b2222222-2222-4222-8222-222222222222';
const REQUEST_ID = 'c3333333-3333-4333-8333-333333333333';

const sentMessage = {
  id: 'e5555555-5555-4555-8555-555555555555',
  body: 'Hello',
  timestamp: '2026-05-27T10:00:00+00:00',
  is_read: false,
  sender: {
    id: 'fake-user-1',
    first_name: 'Fake',
    last_name: 'Member',
    full_name: 'Fake Member',
    profile_image_url: null,
    profile_viewable: false,
  },
  recipient: {
    id: 'a1111111-1111-4111-8111-111111111111',
    first_name: 'Ada',
    last_name: 'Example',
    full_name: 'Ada Example',
    profile_image_url: null,
    profile_viewable: false,
  },
};

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

async function send(subject: ConversationSubject) {
  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

  mockSession({
    authenticatedApiFetch: mockApiFetch({
      'POST /messages': jsonResponse({ message: sentMessage }, 201),
    }),
  });

  const { result } = renderHook(() => useStartConversationMutation(subject), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync('Hello');
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  return invalidateSpy;
}

test('invalidates messages and the item detail after messaging about an item', async () => {
  const invalidateSpy = await send({ itemId: ITEM_ID });

  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: messageKeys.all });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: itemKeys.detail(ITEM_ID),
  });
  expect(invalidateSpy).toHaveBeenCalledTimes(2);
});

test('invalidates only messages after messaging about a request', async () => {
  const invalidateSpy = await send({ requestId: REQUEST_ID });

  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: messageKeys.all });
  expect(invalidateSpy).toHaveBeenCalledTimes(1);
});
