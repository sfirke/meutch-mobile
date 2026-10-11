import { render, screen } from '@testing-library/react-native';

import { FieldError } from '../FieldError';

describe('<FieldError />', () => {
  test('renders nothing without a message', () => {
    render(<FieldError field="title" />);

    expect(screen.queryByTestId('field-error-title')).toBeNull();
  });

  test('renders the message with a field-specific testID', () => {
    render(<FieldError field="title" message="Title is required." />);

    expect(screen.getByTestId('field-error-title')).toHaveTextContent(
      'Title is required.',
    );
  });
});
