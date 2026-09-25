import { fireEvent, render, screen } from '@testing-library/react-native';

import { clampRadius, RadiusInput } from '../RadiusInput';

describe('clampRadius', () => {
  test.each([
    ['', 1],
    ['abc', 1],
    ['0', 1],
    ['1', 1],
    ['25', 25],
    ['50', 50],
    ['51', 50],
    ['999', 50],
    [12.7, 12],
    [-3, 1],
  ])('clampRadius(%p) === %p', (input, expected) => {
    expect(clampRadius(input)).toBe(expected);
  });
});

describe('<RadiusInput />', () => {
  test('renders the label, unit, and hint', () => {
    render(<RadiusInput onChange={jest.fn()} value={10} />);

    expect(screen.getByText('Digest radius')).toBeTruthy();
    expect(screen.getByText('miles')).toBeTruthy();
    expect(screen.getByText('1 to 50 miles')).toBeTruthy();
  });

  test('typing a valid in-range number emits it immediately', () => {
    const onChange = jest.fn();

    render(<RadiusInput onChange={onChange} value={10} />);

    fireEvent.changeText(screen.getByLabelText('Digest radius in miles'), '25');

    expect(onChange).toHaveBeenCalledWith(25);
  });

  test('typing an empty value emits nothing until blur, then clamps to 1', () => {
    const onChange = jest.fn();

    render(<RadiusInput onChange={onChange} value={10} />);

    const input = screen.getByLabelText('Digest radius in miles');

    fireEvent.changeText(input, '');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent(input, 'blur');

    expect(onChange).toHaveBeenCalledWith(1);
    expect(input.props.value).toBe('1');
  });

  test('typing an out-of-range number clamps and emits on blur', () => {
    const onChange = jest.fn();

    render(<RadiusInput onChange={onChange} value={10} />);

    const input = screen.getByLabelText('Digest radius in miles');

    fireEvent.changeText(input, '99');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent(input, 'blur');

    expect(input.props.value).toBe('50');
    expect(onChange).toHaveBeenCalledWith(50);
  });

  test('blur with an unchanged value does not emit', () => {
    const onChange = jest.fn();

    render(<RadiusInput onChange={onChange} value={5} />);

    fireEvent(screen.getByLabelText('Digest radius in miles'), 'blur');

    expect(onChange).not.toHaveBeenCalled();
  });

  test('disabled input is not editable', () => {
    render(<RadiusInput disabled onChange={jest.fn()} value={5} />);

    expect(screen.getByLabelText('Digest radius in miles').props.editable).toBe(
      false,
    );
  });

  test('an external value change updates the displayed text', () => {
    const { rerender } = render(<RadiusInput onChange={jest.fn()} value={5} />);

    expect(screen.getByLabelText('Digest radius in miles').props.value).toBe(
      '5',
    );

    rerender(<RadiusInput onChange={jest.fn()} value={30} />);

    expect(screen.getByLabelText('Digest radius in miles').props.value).toBe(
      '30',
    );
  });
});
