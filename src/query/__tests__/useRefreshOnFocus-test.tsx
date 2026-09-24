import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';
import type { ReactNode } from 'react';

import { createTestQueryClient } from '../../test-utils/renderWithProviders';
import { useRefreshOnFocus } from '../useRefreshOnFocus';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

const mockedUseFocusEffect = jest.mocked(useFocusEffect);
const QUERY_KEY = ['messages', 'thread', 'fake-id'] as const;

function setup() {
  const client = createTestQueryClient();
  const refetchSpy = jest
    .spyOn(client, 'refetchQueries')
    .mockResolvedValue(undefined);
  let onFocus: () => void = () => {};

  mockedUseFocusEffect.mockImplementation((effect) => {
    onFocus = () => {
      effect();
    };
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  renderHook(() => useRefreshOnFocus(QUERY_KEY), { wrapper });

  return { focus: () => onFocus(), refetchSpy };
}

describe('useRefreshOnFocus', () => {
  test('skips the first focus, since mounting already fetched', () => {
    const { focus, refetchSpy } = setup();

    focus();

    expect(refetchSpy).not.toHaveBeenCalled();
  });

  test('refetches stale active queries on later focuses', () => {
    const { focus, refetchSpy } = setup();

    focus();
    focus();

    expect(refetchSpy).toHaveBeenCalledTimes(1);
    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEY,
      stale: true,
      type: 'active',
    });
  });
});
