import { act, fireEvent, screen } from '@testing-library/react-native';
import { Stack, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Pressable, Text } from 'react-native';

import { useDiscardGuard } from '../useDiscardGuard';

// Runs the guard against the real navigator rather than a mocked one.
function Form() {
  const guard = useDiscardGuard();

  return (
    <>
      <Text>Form</Text>
      <Pressable onPress={() => guard.onDirtyChange(true)}>
        <Text>Edit</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          guard.allowLeave();
          router.replace('/done');
        }}
      >
        <Text>Save</Text>
      </Pressable>
      {guard.dialog.visible ? (
        <Pressable onPress={guard.dialog.onConfirm}>
          <Text>Discard</Text>
        </Pressable>
      ) : null}
    </>
  );
}

function renderDirtyForm() {
  renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Home</Text>,
      form: Form,
      done: () => <Text>Done</Text>,
    },
    { initialUrl: '/' },
  );

  act(() => router.push('/form'));
  fireEvent.press(screen.getByText('Edit'));
}

describe('useDiscardGuard in a stack', () => {
  test('holds a dirty form on back until the discard is confirmed', () => {
    renderDirtyForm();

    act(() => router.back());
    expect(screen.getByText('Form')).toBeTruthy();

    fireEvent.press(screen.getByText('Discard'));
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.queryByText('Form')).toBeNull();
  });

  test('navigates straight after a save without asking', () => {
    renderDirtyForm();

    fireEvent.press(screen.getByText('Save'));

    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.queryByText('Discard')).toBeNull();
    expect(screen.queryByText('Form')).toBeNull();
  });
});
