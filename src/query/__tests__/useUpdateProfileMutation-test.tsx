import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { isApiError } from '../../lib/api';
import { feedKeys, itemKeys, profileKeys, userKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  defaultProfileFixture,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  type MockRoute,
} from '../../test-utils/renderWithProviders';
import { useProfileQuery } from '../useProfileQuery';
import { useUpdateProfileMutation } from '../useUpdateProfileMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

// Mounts the read query alongside the mutation, like the screen would.
function useProfileWithMutation() {
  const query = useProfileQuery();
  const mutation = useUpdateProfileMutation();

  return { mutation, query };
}

async function setup(patchRoute: MockRoute) {
  const authenticatedApiFetch = mockApiFetch({
    'GET /me/profile': { user: defaultProfileFixture },
    'PATCH /me/profile': patchRoute,
  });
  const session = mockSession({ authenticatedApiFetch });
  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useProfileWithMutation(), { wrapper });

  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  invalidateSpy.mockClear();

  return { authenticatedApiFetch, invalidateSpy, queryClient, result, session };
}

function patchBody(authenticatedApiFetch: ReturnType<typeof mockApiFetch>) {
  const call = authenticatedApiFetch.mock.calls.find(
    ([, init]) => init?.method === 'PATCH',
  );

  return getRequestBody(call?.[1]) as Record<string, unknown>;
}

describe('useUpdateProfileMutation', () => {
  test('links-only update writes the cache and skips identity refreshes', async () => {
    const links = [
      {
        platform: 'website' as const,
        custom_name: null,
        url: 'https://example.test',
      },
    ];
    const updated = { ...defaultProfileFixture, web_links: [] };
    const {
      authenticatedApiFetch,
      invalidateSpy,
      queryClient,
      result,
      session,
    } = await setup({ user: updated, image_upload_failed: false });

    act(() => {
      result.current.mutation.mutate({ links });
    });
    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(patchBody(authenticatedApiFetch)).toEqual({ links });
    expect(queryClient.getQueryData(profileKeys.me())).toEqual(updated);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: userKeys.detail(updated.id),
    });
    expect(session.refreshUser).not.toHaveBeenCalled();
  });

  test('first-name update refreshes the session user and marks lists stale', async () => {
    const updated = { ...defaultProfileFixture, first_name: 'Renamed' };
    const { invalidateSpy, queryClient, result, session } = await setup({
      user: updated,
    });

    act(() => {
      result.current.mutation.mutate({ first_name: 'Renamed' });
    });
    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(session.refreshUser).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(profileKeys.me())).toEqual(updated);
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: itemKeys.all, refetchType: 'none' }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: feedKeys.all, refetchType: 'none' }),
    );
  });

  test('photo removal sends delete_image and refreshes the session user', async () => {
    const updated = { ...defaultProfileFixture, profile_image_url: null };
    const { authenticatedApiFetch, result, session } = await setup({
      user: updated,
    });

    act(() => {
      result.current.mutation.mutate({ photo: { kind: 'remove' } });
    });
    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(patchBody(authenticatedApiFetch)).toEqual({ delete_image: true });
    expect(session.refreshUser).toHaveBeenCalledTimes(1);
  });

  test('exposes imageUploadFailed and still caches the user', async () => {
    const updated = { ...defaultProfileFixture, first_name: 'Renamed' };
    const { queryClient, result } = await setup({
      user: updated,
      image_upload_failed: true,
    });

    act(() => {
      result.current.mutation.mutate({ first_name: 'Renamed' });
    });
    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(result.current.mutation.data?.imageUploadFailed).toBe(true);
    expect(queryClient.getQueryData(profileKeys.me())).toEqual(updated);
  });

  test('a 422 surfaces as an ApiError and leaves the cache untouched', async () => {
    const { invalidateSpy, queryClient, result, session } = await setup(
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid link.',
            details: { links: { '0': { url: ['Invalid URL.'] } } },
          },
        },
        422,
      ),
    );

    act(() => {
      result.current.mutation.mutate({ first_name: 'Renamed' });
    });
    await waitFor(() => expect(result.current.mutation.isError).toBe(true));

    const { error } = result.current.mutation;
    expect(isApiError(error) && error.status).toBe(422);
    expect(queryClient.getQueryData(profileKeys.me())).toEqual(
      defaultProfileFixture,
    );
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(session.refreshUser).not.toHaveBeenCalled();
  });
});
