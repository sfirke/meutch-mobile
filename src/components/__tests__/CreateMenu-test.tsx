import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { CreateMenu } from '../CreateMenu';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const mockedPush = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push: mockedPush,
  } as unknown as ReturnType<typeof useRouter>);
});

describe('<CreateMenu />', () => {
  test('starts with the sheet closed', () => {
    render(<CreateMenu />);

    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
    expect(screen.queryByTestId('option-sheet')).toBeNull();
    expect(screen.queryByText('List an item')).toBeNull();
  });

  test('opens the sheet with a List an item row', () => {
    render(<CreateMenu />);

    fireEvent.press(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByRole('header', { name: 'Create' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'List an item' })).toBeTruthy();
    expect(screen.queryByRole('button', { selected: true })).toBeNull();
  });

  test('List an item opens the new item form and closes the sheet', () => {
    render(<CreateMenu />);

    fireEvent.press(screen.getByRole('button', { name: 'Create' }));
    fireEvent.press(screen.getByRole('button', { name: 'List an item' }));

    expect(mockedPush).toHaveBeenCalledWith('/item/new');
    expect(screen.queryByTestId('option-sheet')).toBeNull();
  });

  test('the backdrop closes the sheet without navigating', () => {
    render(<CreateMenu />);

    fireEvent.press(screen.getByRole('button', { name: 'Create' }));
    fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByTestId('option-sheet')).toBeNull();
    expect(mockedPush).not.toHaveBeenCalled();
  });
});
