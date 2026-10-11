import { act, renderHook } from '@testing-library/react-native';

import { useDiscardGuard } from '../useDiscardGuard';

type LeaveEvent = {
  preventDefault: jest.Mock;
  data: { action: { type: string } };
};

const mockListeners: Record<string, (event: LeaveEvent) => void> = {};
const mockNavigation = {
  addListener: jest.fn(
    (name: string, listener: (event: LeaveEvent) => void) => {
      mockListeners[name] = listener;
      return () => undefined;
    },
  ),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  getParent: jest.fn(() => mockParent),
};
const mockParent = { setOptions: jest.fn() };

jest.mock('expo-router', () => ({ useNavigation: () => mockNavigation }));
jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (
    prevent: boolean,
    callback: (event: { data: LeaveEvent['data'] }) => void,
  ) => {
    mockNavigation.addListener('beforeRemove', (event: LeaveEvent) => {
      if (prevent) {
        event.preventDefault();
        callback({ data: event.data });
      }
    });
  },
}));

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

  test('switches the back gesture off only while guarding', () => {
    const { result } = renderHook(() => useDiscardGuard());

    expect(mockNavigation.setOptions).not.toHaveBeenCalled();

    act(() => result.current.onDirtyChange(true));
    expect(mockNavigation.setOptions).toHaveBeenLastCalledWith({
      gestureEnabled: false,
    });
    expect(mockParent.setOptions).toHaveBeenLastCalledWith({
      gestureEnabled: false,
    });

    act(() => result.current.onDirtyChange(false));
    expect(mockNavigation.setOptions).toHaveBeenLastCalledWith({
      gestureEnabled: undefined,
    });
    expect(mockParent.setOptions).toHaveBeenLastCalledWith({
      gestureEnabled: undefined,
    });
  });

  test('replays a leave made in the same tick as allowLeave', () => {
    const { result } = renderHook(() => useDiscardGuard());

    act(() => result.current.onDirtyChange(true));
    act(() => {
      result.current.allowLeave();
      mockListeners.beforeRemove({
        preventDefault: jest.fn(),
        data: { action: ACTION },
      });
    });

    expect(result.current.dialog.visible).toBe(false);
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(ACTION);
  });
});
