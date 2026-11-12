import { fireEvent, render, screen } from '@testing-library/react-native';

import { HeaderCancelButton } from '../HeaderCancelButton';

describe('<HeaderCancelButton />', () => {
  test('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<HeaderCancelButton onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
