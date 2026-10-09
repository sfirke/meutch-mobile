import { act, renderHook } from '@testing-library/react-native';

import { useDiscardGuard } from '../useDiscardGuard';

type LeaveEvent = {
  preventDefault: jest.Mock;
  data: { action: { type: string } };
};

const mockUnsubscribe = jest.fn();
const mockListeners: Record<string, (event: LeaveEvent) => void> = {};
const mockNavigation = {
  addListener: jest.fn(
    (name: string, listener: (event: LeaveEvent) => void) => {
      mockListeners[name] = listener;
      return mockUnsubscribe;
    },
  ),
  dispatch: jest.fn(),
};

jest.mock('expo-router', () => ({ useNavigation: () => mockNavigation }));

const ACTION = { type: 'GO_BACK' };

function leave() {
  const event: LeaveEvent = {
    preventDefault: jest.fn(),
    data: { action: ACTION },
  };

  act(() => mockListeners.beforeRemove(event));

  return event;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useDiscardGuard', () => {
  test('lets a clean screen leave', () => {
    const { result } = renderHook(() => useDiscardGuard());

    expect(leave().preventDefault).not.toHaveBeenCalled();
    expect(result.current.dialog.visible).toBe(false);
  });

  test('holds a dirty leave until confirmed', () => {
    const { result } = renderHook(() => useDiscardGuard());

    act(() => result.current.onDirtyChange(true));
    expect(leave().preventDefault).toHaveBeenCalled();
    expect(result.current.dialog.visible).toBe(true);

    act(() => result.current.dialog.onCancel());
    expect(result.current.dialog.visible).toBe(false);
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();

    leave();
    act(() => result.current.dialog.onConfirm());
    expect(result.current.dialog.visible).toBe(false);
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(ACTION);
  });

  test('lets a dirty screen leave after allowLeave', () => {
    const { result } = renderHook(() => useDiscardGuard());

    act(() => {
      result.current.onDirtyChange(true);
      result.current.allowLeave();
    });

    expect(leave().preventDefault).not.toHaveBeenCalled();
  });

  test('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useDiscardGuard());

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
