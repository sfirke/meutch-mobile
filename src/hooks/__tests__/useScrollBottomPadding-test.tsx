import { renderHook } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { spacing } from '../../theme';
import { useScrollBottomPadding } from '../useScrollBottomPadding';

function wrapperWithBottomInset(bottom: number) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom },
        }}
      >
        {children}
      </SafeAreaProvider>
    );
  };
}

describe('useScrollBottomPadding', () => {
  test('adds the home indicator inset to the base padding', () => {
    const { result } = renderHook(() => useScrollBottomPadding(), {
      wrapper: wrapperWithBottomInset(34),
    });

    expect(result.current).toBe(spacing[24] + 34);
  });

  test('keeps the base padding on a device without an inset', () => {
    const { result } = renderHook(() => useScrollBottomPadding(), {
      wrapper: wrapperWithBottomInset(0),
    });

    expect(result.current).toBe(spacing[24]);
  });
});
