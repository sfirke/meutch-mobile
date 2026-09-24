import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { isApiError } from '../../lib/api';
import { profileKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  defaultSettingsFixture,
  jsonResponse,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useSettingsQuery } from '../useSettingsQuery';
import { useUpdateSettingsMutation } from '../useUpdateSettingsMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

// Mounts the read query alongside the mutation, like a real screen would, so
// the cache entry stays observed and the query's own data reflects the write.
function useSettingsWithMutation() {
  const query = useSettingsQuery();
  const mutation = useUpdateSettingsMutation();

  return { mutation, query };
}

describe('useUpdateSettingsMutation', () => {
  test('writes the response into the settings cache', async () => {
    const updatedSettings = {
      ...defaultSettingsFixture,
      vacation_mode: true,
      digest_frequency: 'daily' as const,
    };
    const authenticatedApiFetch = mockApiFetch({
      'GET /me/settings': { settings: defaultSettingsFixture },
      'PATCH /me/settings': { settings: updatedSettings },
    });
    mockSession({ authenticatedApiFetch });

    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSettingsWithMutation(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    act(() => {
      result.current.mutation.mutate(updatedSettings);
    });

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(queryClient.getQueryData(profileKeys.settings())).toEqual(
      updatedSettings,
    );
    expect(result.current.query.data).toEqual(updatedSettings);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test('leaves the cache untouched on a 422 and exposes error details', async () => {
    const authenticatedApiFetch = mockApiFetch({
      'GET /me/settings': { settings: defaultSettingsFixture },
      'PATCH /me/settings': () =>
        jsonResponse(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Input validation failed.',
              details: {
                digest_radius_miles: ['Must be between 1 and 50.'],
              },
            },
          },
          422,
        ),
    });
    mockSession({ authenticatedApiFetch });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSettingsWithMutation(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    act(() => {
      result.current.mutation.mutate({
        ...defaultSettingsFixture,
        digest_radius_miles: 500,
      });
    });

    await waitFor(() => expect(result.current.mutation.isError).toBe(true));

    const error = result.current.mutation.error;
    expect(isApiError(error) && error.details).toEqual({
      digest_radius_miles: ['Must be between 1 and 50.'],
    });
    expect(queryClient.getQueryData(profileKeys.settings())).toEqual(
      defaultSettingsFixture,
    );
    expect(result.current.query.data).toEqual(defaultSettingsFixture);
  });
});
