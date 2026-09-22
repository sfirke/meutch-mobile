import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { profileKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  defaultProfileFixture,
  getRequestBody,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useProfileQuery } from '../useProfileQuery';
import { useUpdateAboutMeMutation } from '../useUpdateAboutMeMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

// Mounts the read query alongside the mutation, like a real screen would, so
// the cache entry stays observed and the query's own data reflects the write.
function useProfileWithMutation() {
  const query = useProfileQuery();
  const mutation = useUpdateAboutMeMutation();

  return { mutation, query };
}

describe('useUpdateAboutMeMutation', () => {
  test('writes the response into the profile cache without invalidating', async () => {
    const updatedProfile = {
      ...defaultProfileFixture,
      about_me: 'Updated bio',
    };
    const authenticatedApiFetch = mockApiFetch({
      'GET /me/profile': { user: defaultProfileFixture },
      'PATCH /me/profile': { user: updatedProfile, image_upload_failed: false },
    });
    mockSession({ authenticatedApiFetch });

    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProfileWithMutation(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    act(() => {
      result.current.mutation.mutate('Updated bio');
    });

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    const patchCall = authenticatedApiFetch.mock.calls.find(
      ([, init]) => init?.method === 'PATCH',
    );
    const body = getRequestBody(patchCall?.[1]) as Record<string, unknown>;
    expect(body).toEqual({ about_me: 'Updated bio' });

    expect(queryClient.getQueryData(profileKeys.me())).toEqual(updatedProfile);
    expect(result.current.query.data).toEqual(updatedProfile);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
