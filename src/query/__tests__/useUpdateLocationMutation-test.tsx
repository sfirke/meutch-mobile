import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';

import { type AddressInput } from '../../lib/location';
import {
  circleKeys,
  feedKeys,
  itemKeys,
  profileKeys,
} from '../../lib/queryKeys';
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
import { useUpdateLocationMutation } from '../useUpdateLocationMutation';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const ADDRESS: AddressInput = {
  street: ' 1 Example St ',
  city: 'Exampleville',
  state: 'EX',
  zip_code: '00000',
  country: 'US',
};

function useProfileWithMutation() {
  const query = useProfileQuery();
  const mutation = useUpdateLocationMutation();

  return { mutation, query };
}

async function setup(locationRoute: MockRoute) {
  const authenticatedApiFetch = mockApiFetch({
    'GET /me/profile': { user: defaultProfileFixture },
    'PATCH /me/location': locationRoute,
  });
  mockSession({ authenticatedApiFetch });

  const queryClient = createTestQueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(() => useProfileWithMutation(), { wrapper });

  await waitFor(() =>
    expect(rendered.result.current.query.isSuccess).toBe(true),
  );
  invalidateSpy.mockClear();

  return { authenticatedApiFetch, invalidateSpy, queryClient, ...rendered };
}

function patchBody(
  fetchMock: Awaited<ReturnType<typeof setup>>['authenticatedApiFetch'],
) {
  const call = fetchMock.mock.calls.find(
    ([, init]) => init?.method === 'PATCH',
  );

  return getRequestBody(call?.[1]);
}

function invalidatedKeys(spy: jest.SpyInstance) {
  return spy.mock.calls.map(
    ([filters]) => (filters as { queryKey: unknown }).queryKey,
  );
}

describe('useUpdateLocationMutation', () => {
  test('sets a location from an address and marks lists stale', async () => {
    const { authenticatedApiFetch, invalidateSpy, queryClient, result } =
      await setup({
        status: 'success',
        user: { has_location: true, geocoding_failed: false },
      });

    act(() => {
      result.current.mutation.mutate(ADDRESS);
    });
    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(patchBody(authenticatedApiFetch)).toEqual({
      location_method: 'address',
      street: '1 Example St',
      city: 'Exampleville',
      state: 'EX',
      zip_code: '00000',
      country: 'US',
    });
    expect(queryClient.getQueryData(profileKeys.me())).toEqual({
      ...defaultProfileFixture,
      has_location: true,
    });
    expect(invalidatedKeys(invalidateSpy)).toEqual(
      expect.arrayContaining([itemKeys.all, feedKeys.all, circleKeys.all]),
    );
    for (const [filters] of invalidateSpy.mock.calls) {
      expect(filters).toMatchObject({ refetchType: 'none' });
    }
  });

  test('removes the location', async () => {
    const { authenticatedApiFetch, invalidateSpy, queryClient, result } =
      await setup({
        status: 'removed',
        user: { has_location: false, geocoding_failed: false },
      });
    queryClient.setQueryData(profileKeys.me(), {
      ...defaultProfileFixture,
      has_location: true,
    });

    act(() => {
      result.current.mutation.mutate('remove');
    });
    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(patchBody(authenticatedApiFetch)).toEqual({
      location_method: 'remove',
    });
    expect(queryClient.getQueryData(profileKeys.me())).toMatchObject({
      has_location: false,
    });
    expect(invalidatedKeys(invalidateSpy)).toContainEqual(circleKeys.all);
  });

  test('rate_limited resolves, merges flags and leaves lists alone', async () => {
    const { invalidateSpy, queryClient, result } = await setup({
      status: 'rate_limited',
      user: { has_location: true, geocoding_failed: false },
    });

    act(() => {
      result.current.mutation.mutate(ADDRESS);
    });
    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(result.current.mutation.data?.status).toBe('rate_limited');
    expect(queryClient.getQueryData(profileKeys.me())).toMatchObject({
      has_location: true,
      geocoding_failed: false,
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test('geocoding_failed merges the failure flag into the profile', async () => {
    const { invalidateSpy, queryClient, result } = await setup({
      status: 'geocoding_failed',
      user: { has_location: false, geocoding_failed: true },
    });

    act(() => {
      result.current.mutation.mutate(ADDRESS);
    });
    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(queryClient.getQueryData(profileKeys.me())).toMatchObject({
      has_location: false,
      geocoding_failed: true,
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test('surfaces an API error and leaves the cache untouched', async () => {
    const { invalidateSpy, queryClient, result } = await setup(
      jsonResponse(
        { error: { code: 'SERVER_ERROR', message: 'Try later.', details: {} } },
        500,
      ),
    );

    await act(async () => {
      await result.current.mutation.mutateAsync(ADDRESS).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.mutation.isError).toBe(true));

    expect(result.current.mutation.error).toHaveProperty(
      'message',
      'Try later.',
    );
    expect(queryClient.getQueryData(profileKeys.me())).toEqual(
      defaultProfileFixture,
    );
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
