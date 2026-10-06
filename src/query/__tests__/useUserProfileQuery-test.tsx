import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  createTestQueryClient,
  jsonResponse,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useUserProfileQuery } from '../useUserProfileQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const USER_ID = 'a1111111-1111-4111-8111-111111111111';

function createUserProfileResponse(overrides?: Record<string, unknown>) {
  return {
    user: {
      id: USER_ID,
      first_name: 'Ada',
      last_name: 'Example',
      full_name: 'Ada Example',
      profile_image_url: null,
      about_me: null,
      web_links: [],
    },
    shared_circles: [],
    access_reason: 'circle',
    ...overrides,
  };
}

function createWrapper(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

test('fetches and unwraps a user profile', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    [`GET /users/${USER_ID}`]: createUserProfileResponse(),
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useUserProfileQuery(USER_ID), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.user.full_name).toBe('Ada Example');
  expect(result.current.data?.access_reason).toBe('circle');
});

test('surfaces a 404 as an error', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    [`GET /users/${USER_ID}`]: jsonResponse(
      { error: { code: 'NOT_FOUND', message: 'Not found.' } },
      404,
    ),
  });

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useUserProfileQuery(USER_ID), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
});

test('does not fetch for a non-UUID id', async () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({});

  mockSession({ authenticatedApiFetch });

  const { result } = renderHook(() => useUserProfileQuery('not-a-uuid'), {
    wrapper: createWrapper(queryClient),
  });

  await waitFor(() => expect(result.current.isPending).toBe(true));
  expect(authenticatedApiFetch).not.toHaveBeenCalled();
});

test('does not fetch for an undefined id', () => {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({});

  mockSession({ authenticatedApiFetch });

  renderHook(() => useUserProfileQuery(undefined), {
    wrapper: createWrapper(queryClient),
  });

  expect(authenticatedApiFetch).not.toHaveBeenCalled();
});
