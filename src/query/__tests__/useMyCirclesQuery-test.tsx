import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { circleKeys } from '../../lib/queryKeys';
import {
  createTestQueryClient,
  mockApiFetch,
  mockSession,
} from '../../test-utils/renderWithProviders';
import { useMyCirclesQuery } from '../useMyCirclesQuery';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const CIRCLE_A = 'a1111111-1111-4111-8111-111111111111';
const CIRCLE_B = 'b2222222-2222-4222-8222-222222222222';

function createCircle(id: string, name: string) {
  return {
    id,
    name,
    description: null,
    circle_type: 'open',
    is_regional: false,
    regional_radius_miles: null,
    created_at: '2026-01-10T12:00:00+00:00',
    image_url: null,
    requires_join_approval: false,
    member_count: 3,
    is_member: true,
    is_admin: false,
    has_pending_join_request: false,
    pending_join_request_count: 0,
    distance_miles: null,
  };
}

function setup(options?: Parameters<typeof useMyCirclesQuery>[0]) {
  const queryClient = createTestQueryClient();
  const authenticatedApiFetch = mockApiFetch({
    'GET /circles?membership=mine&page=1&per_page=50': {
      circles: [createCircle(CIRCLE_B, 'Zed'), createCircle(CIRCLE_A, 'Alpha')],
      pagination: {
        page: 1,
        per_page: 50,
        total: 2,
        pages: 1,
        has_next: false,
        has_prev: false,
      },
    },
  });
  mockSession({ authenticatedApiFetch });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useMyCirclesQuery(options), { wrapper });

  return { queryClient, authenticatedApiFetch, ...hook };
}

describe('useMyCirclesQuery', () => {
  test('fetches all circles sorted by name under the mineAll key', async () => {
    const { result, queryClient } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((circle) => circle.id)).toEqual([
      CIRCLE_A,
      CIRCLE_B,
    ]);
    expect(queryClient.getQueryData(circleKeys.mineAll())).toEqual(
      result.current.data,
    );
  });

  test('makes no request when disabled', () => {
    const { result, authenticatedApiFetch } = setup({ enabled: false });

    expect(authenticatedApiFetch).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });
});
