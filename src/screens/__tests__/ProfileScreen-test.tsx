import { fireEvent, screen } from '@testing-library/react-native';

import {
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { ProfileScreen } from '../ProfileScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

test('shows the signed-in member name', async () => {
  mockSession({
    user: {
      email: 'member@example.com',
      email_confirmed: true,
      first_name: 'Morgan',
      full_name: 'Morgan Member',
      id: '0f2f0d1a-6e8b-4f0f-9c2f-1b9d2a3c4d5e',
      last_name: 'Member',
      profile_image_url: null,
    },
  });

  renderWithProviders(<ProfileScreen />);

  expect(await screen.findByText('Morgan Member')).toBeTruthy();
});

test('signs out when the button is pressed', async () => {
  const session = mockSession();

  renderWithProviders(<ProfileScreen />);

  fireEvent.press(await screen.findByRole('button', { name: 'Sign out' }));

  expect(session.signOut).toHaveBeenCalledTimes(1);
});

test('disables the button and relabels it while signing out', async () => {
  mockSession({ status: 'signing-out' });

  renderWithProviders(<ProfileScreen />);

  expect(
    await screen.findByRole('button', { name: 'Sign out' }),
  ).toBeDisabled();
  expect(screen.getByText('Signing out...')).toBeTruthy();
});
