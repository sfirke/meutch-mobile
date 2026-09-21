import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '../useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('drill', 350));

    expect(result.current).toBe('drill');
  });

  test('holds the previous value until the delay elapses', () => {
    const { rerender, result } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 350),
      { initialProps: { value: 'drill' } },
    );

    rerender({ value: 'ladder' });
    expect(result.current).toBe('drill');

    act(() => {
      jest.advanceTimersByTime(349);
    });
    expect(result.current).toBe('drill');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ladder');
  });

  test('restarts the delay on every change, emitting only the last value', () => {
    const { rerender, result } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 350),
      { initialProps: { value: '' } },
    );

    rerender({ value: 'l' });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    rerender({ value: 'la' });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    rerender({ value: 'lad' });

    expect(result.current).toBe('');

    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(result.current).toBe('lad');
  });

  test('works for non-string values', () => {
    const { rerender, result } = renderHook(
      ({ value }: { value: number }) => useDebouncedValue(value, 10),
      { initialProps: { value: 1 } },
    );

    rerender({ value: 2 });
    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(result.current).toBe(2);
  });
});
