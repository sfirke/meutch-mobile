import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { apiFetch } from '../../lib/api';
import {
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';

jest.mock('../../lib/api', () => ({
  ...jest.requireActual('../../lib/api'),
  apiFetch: jest.fn(),
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    canGoBack: mockCanGoBack,
    replace: mockReplace,
  }),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const SENT_MESSAGE =
  'If an account with that email exists, password reset instructions have been sent.';

function mockApi(route: unknown) {
  const fetchMock = mockApiFetch({ 'POST /auth/forgot-password': route });
  jest.mocked(apiFetch).mockImplementation(fetchMock);

  return fetchMock;
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return jsonResponse({ error: { code, message, details } }, status);
}

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    jest.mocked(useLocalSearchParams).mockReturnValue({});
  });

  test('prefills the email from params', () => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ email: 'member@example.com' });
    renderWithProviders(<ForgotPasswordScreen />);

    expect(screen.getByTestId('field-email').props.value).toBe(
      'member@example.com',
    );
  });

  test('disables the button while the email is blank', () => {
    renderWithProviders(<ForgotPasswordScreen />);

    const submit = screen.getByRole('button', { name: 'Send reset link' });

    expect(submit).toBeDisabled();

    fireEvent.changeText(screen.getByTestId('field-email'), '   ');
    expect(submit).toBeDisabled();

    fireEvent.changeText(screen.getByTestId('field-email'), 'a@example.com');
    expect(submit).toBeEnabled();
  });

  test('posts the trimmed email and shows the sent state', async () => {
    const fetchMock = mockApi({ message: SENT_MESSAGE });
    renderWithProviders(<ForgotPasswordScreen />);

    fireEvent.changeText(
      screen.getByTestId('field-email'),
      '  member@example.com ',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByTestId('forgot-password-sent')).toBeTruthy();
    expect(screen.getByText('Check your email')).toBeTruthy();
    expect(screen.getByText(SENT_MESSAGE)).toBeTruthy();
    expect(screen.getByText(/opens meutch\.com/)).toBeTruthy();
    expect(screen.queryByTestId('field-email')).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe('/auth/forgot-password');
    expect(getRequestBody(fetchMock.mock.calls[0][1])).toEqual({
      email: 'member@example.com',
    });
  });

  test('shows a 422 reason under the field', async () => {
    mockApi(
      errorResponse(422, 'VALIDATION_ERROR', 'Invalid input.', {
        email: ['Enter a valid email address.'],
      }),
    );
    renderWithProviders(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('field-email'), 'not-an-email');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByTestId('field-error-email')).toHaveTextContent(
      'Enter a valid email address.',
    );
    expect(screen.queryByTestId('forgot-password-error')).toBeNull();
  });

  test('shows the per-hour copy on a 429', async () => {
    mockApi(errorResponse(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests.'));
    renderWithProviders(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('field-email'), 'a@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByTestId('forgot-password-error')).toBeTruthy();
    expect(screen.getByText('Slow down')).toBeTruthy();
    expect(
      screen.getByText(
        "You've asked for this email too many times. Try again in an hour.",
      ),
    ).toBeTruthy();
  });

  test('goes back to sign in', () => {
    renderWithProviders(<ForgotPasswordScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));

    expect(mockBack).toHaveBeenCalled();
  });

  test('replaces with sign in when there is nothing to go back to', async () => {
    mockCanGoBack.mockReturnValue(false);
    renderWithProviders(<ForgotPasswordScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/sign-in'));
    expect(mockBack).not.toHaveBeenCalled();
  });
});
