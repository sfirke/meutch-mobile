import { fireEvent, render, screen } from '@testing-library/react-native';

import { UploadTile } from '../UploadTile';

describe('<UploadTile />', () => {
  test('is a button with the given label and calls onPress', () => {
    const onPress = jest.fn();
    render(<UploadTile accessibilityLabel="Add photo" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(
      <UploadTile accessibilityLabel="Add photo" disabled onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  test('stays pressable when it already has a file', () => {
    const onPress = jest.fn();
    render(
      <UploadTile
        accessibilityLabel="Replace photo"
        hasFile
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Replace photo' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
