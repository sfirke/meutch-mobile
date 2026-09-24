import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';

import { runtimeConfig } from '../../config/env';
import type { ApiFetch } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  defaultProfileFixture,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { ProfileScreen } from '../ProfileScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

// Mutable so a test can flip the environment the footer reads.
jest.mock('../../config/env', () => ({
  runtimeConfig: {
    environmentName: 'local',
    apiBaseUrl: 'https://api.example.test/api/v1',
  },
  buildApiUrl: (path: string) => `https://api.example.test/api/v1${path}`,
}));

// `about_me` is `null` in the shared fixture, so widen it for the edit tests.
type ProfileFixture = Omit<typeof defaultProfileFixture, 'about_me'> & {
  about_me: string | null;
};

const baseProfile: ProfileFixture = {
  ...defaultProfileFixture,
  id: '0f2f0d1a-6e8b-4f0f-9c2f-1b9d2a3c4d5e',
  email: 'member@example.com',
  email_confirmed: true,
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
};

const blogLink = {
  id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  platform_type: 'website',
  platform_name: 'Website',
  display_name: 'My woodworking blog',
  url: 'https://links.example.test/blog',
  display_order: 0,
};

function buildProfile(overrides?: Partial<ProfileFixture>): ProfileFixture {
  return { ...baseProfile, ...overrides };
}

function profileRoute(overrides?: Partial<ProfileFixture>) {
  return { user: buildProfile(overrides) };
}

function renderProfileScreen(authenticatedApiFetch: ApiFetch) {
  mockSession({ authenticatedApiFetch });

  return renderWithProviders(<ProfileScreen />);
}

const mockedPush = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  runtimeConfig.environmentName = 'local';
  jest.mocked(useRouter).mockReturnValue({
    push: mockedPush,
  } as unknown as ReturnType<typeof useRouter>);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

describe('profile screen', () => {
  test('shows a loading indicator while the profile loads', async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    const authenticatedApiFetch = jest.fn(
      async () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as unknown as ApiFetch;

    renderProfileScreen(authenticatedApiFetch);

    expect(await screen.findByLabelText('Loading profile')).toBeTruthy();

    resolveFetch(jsonResponse(profileRoute()));
    await waitFor(() =>
      expect(screen.queryByLabelText('Loading profile')).toBeNull(),
    );
  });

  test('renders the member header, avatar, and the about-me prompt', async () => {
    renderProfileScreen(mockApiFetch({ 'GET /me/profile': profileRoute() }));

    expect(await screen.findByText('Morgan Member')).toBeTruthy();
    expect(screen.getByText('member@example.com')).toBeTruthy();
    expect(screen.getByText('Member since Jan 2026')).toBeTruthy();
    expect(screen.getByTestId('profile-avatar-initials')).toBeTruthy();
    expect(screen.getByText('Add a few words about yourself')).toBeTruthy();
    expect(screen.queryByText('Unconfirmed')).toBeNull();
  });

  test('flags an unconfirmed email address', async () => {
    renderProfileScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute({ email_confirmed: false }),
      }),
    );

    expect(await screen.findByText('Unconfirmed')).toBeTruthy();
  });

  test('renders saved about-me text instead of the prompt', async () => {
    renderProfileScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute({ about_me: 'I fix bicycles.' }),
      }),
    );

    expect(await screen.findByText('I fix bicycles.')).toBeTruthy();
    expect(screen.queryByText('Add a few words about yourself')).toBeNull();
  });

  test('omits the member-since line when the date is unreadable', async () => {
    renderProfileScreen(
      mockApiFetch({ 'GET /me/profile': profileRoute({ created_at: 'soon' }) }),
    );

    expect(await screen.findByText('Morgan Member')).toBeTruthy();
    expect(screen.queryByText(/Member since/)).toBeNull();
  });

  test('opens a web link in the browser when its row is pressed', async () => {
    renderProfileScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute({ web_links: [blogLink] }),
      }),
    );

    fireEvent.press(await screen.findByLabelText('My woodworking blog'));

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://links.example.test/blog',
    );
    expect(
      screen.getByText('Edit links and photo on meutch.com.'),
    ).toBeTruthy();
  });

  test('reads "Location set" when the member has a location', async () => {
    renderProfileScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute({ has_location: true }),
      }),
    );

    expect(await screen.findByText('Location set')).toBeTruthy();
    expect(
      screen.getByText('Update your location on meutch.com.'),
    ).toBeTruthy();
  });

  test('reads the geocoding failure copy when geocoding failed', async () => {
    renderProfileScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute({ geocoding_failed: true }),
      }),
    );

    expect(
      await screen.findByText("We couldn't determine your location"),
    ).toBeTruthy();
  });

  test('reads "No location set" when there is no location', async () => {
    renderProfileScreen(mockApiFetch({ 'GET /me/profile': profileRoute() }));

    expect(await screen.findByText('No location set')).toBeTruthy();
  });

  test('shows error copy and reloads the profile on retry', async () => {
    const authenticatedApiFetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: "You're doing that a bit too fast.",
            },
          },
          429,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(profileRoute()),
      ) as unknown as jest.MockedFunction<ApiFetch>;

    renderProfileScreen(authenticatedApiFetch);

    expect(await screen.findByText('Slow down')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText('Morgan Member')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
  });

  test('sends only about_me when the editor is saved', async () => {
    let patchBody: unknown;
    const authenticatedApiFetch = mockApiFetch({
      'GET /me/profile': profileRoute({ about_me: 'Old words.' }),
      'PATCH /me/profile': (init?: RequestInit) => {
        patchBody = getRequestBody(init);

        return {
          user: buildProfile({ about_me: 'New words.' }),
          image_upload_failed: false,
        };
      },
    });

    renderProfileScreen(authenticatedApiFetch);

    fireEvent.press(await screen.findByLabelText('Edit about me'));
    fireEvent.changeText(screen.getByLabelText('About me'), 'New words.');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('New words.')).toBeTruthy();
    expect(patchBody).toEqual({ about_me: 'New words.' });
    expect(screen.queryByLabelText('About me')).toBeNull();
  });

  test('relabels Save while the about-me write is in flight', async () => {
    let resolvePatch: (response: Response) => void = () => undefined;
    const authenticatedApiFetch = jest.fn(
      async (_path: string, init?: RequestInit) => {
        if ((init?.method ?? 'GET') !== 'GET') {
          return new Promise<Response>((resolve) => {
            resolvePatch = resolve;
          });
        }

        return jsonResponse(profileRoute({ about_me: 'Old words.' }));
      },
    ) as unknown as ApiFetch;

    renderProfileScreen(authenticatedApiFetch);

    fireEvent.press(await screen.findByLabelText('Edit about me'));
    fireEvent.changeText(screen.getByLabelText('About me'), 'New words.');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByRole('button', { name: 'Saving...' }),
    ).toBeDisabled();

    resolvePatch(
      jsonResponse({
        user: buildProfile({ about_me: 'New words.' }),
        image_upload_failed: false,
      }),
    );

    expect(await screen.findByText('New words.')).toBeTruthy();
  });

  test('disables Save until the about-me draft changes', async () => {
    renderProfileScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute({ about_me: 'Old words.' }),
      }),
    );

    fireEvent.press(await screen.findByLabelText('Edit about me'));

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('About me'), 'Newer words.');

    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });

  test('shows the character counter once the draft nears the limit', async () => {
    renderProfileScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute({ about_me: 'Old words.' }),
      }),
    );

    fireEvent.press(await screen.findByLabelText('Edit about me'));
    fireEvent.changeText(screen.getByLabelText('About me'), 'a'.repeat(451));

    expect(screen.getByText('451/500')).toBeTruthy();
  });

  test('cancel restores the saved text and sends nothing', async () => {
    const authenticatedApiFetch = mockApiFetch({
      'GET /me/profile': profileRoute({ about_me: 'Old words.' }),
    });

    renderProfileScreen(authenticatedApiFetch);

    fireEvent.press(await screen.findByLabelText('Edit about me'));
    fireEvent.changeText(screen.getByLabelText('About me'), 'Abandoned draft.');
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Old words.')).toBeTruthy();
    expect(screen.queryByLabelText('About me')).toBeNull();
    for (const [, init] of authenticatedApiFetch.mock.calls) {
      expect(init?.method ?? 'GET').toBe('GET');
    }
  });

  test('keeps the draft and shows the field message when a save is rejected', async () => {
    renderProfileScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute({ about_me: 'Old words.' }),
        'PATCH /me/profile': jsonResponse(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input.',
              details: { about_me: ['Keep it under 500 characters.'] },
            },
          },
          422,
        ),
      }),
    );

    fireEvent.press(await screen.findByLabelText('Edit about me'));
    fireEvent.changeText(screen.getByLabelText('About me'), 'Too much text.');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByTestId('about-me-error')).toHaveTextContent(
      'Keep it under 500 characters.',
    );
    expect(screen.getByDisplayValue('Too much text.')).toBeTruthy();
  });

  test('falls back to shared copy when a save fails without field details', async () => {
    renderProfileScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute({ about_me: 'Old words.' }),
        'PATCH /me/profile': jsonResponse(
          {
            error: {
              code: 'API_READ_ONLY',
              message: 'Writes are disabled.',
            },
          },
          503,
        ),
      }),
    );

    fireEvent.press(await screen.findByLabelText('Edit about me'));
    fireEvent.changeText(screen.getByLabelText('About me'), 'New words.');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByTestId('about-me-error')).toHaveTextContent(
      "We're doing some maintenance. Please try again soon.",
    );
    expect(screen.getByDisplayValue('New words.')).toBeTruthy();
  });

  test('pushes the settings route from the Settings row', async () => {
    renderProfileScreen(mockApiFetch({ 'GET /me/profile': profileRoute() }));

    fireEvent.press(await screen.findByRole('button', { name: 'Settings' }));

    expect(mockedPush).toHaveBeenCalledWith('/profile/settings');
  });

  test('sends no write requests while only reading the profile', async () => {
    const authenticatedApiFetch = mockApiFetch({
      'GET /me/profile': profileRoute({ web_links: [blogLink] }),
    });

    renderProfileScreen(authenticatedApiFetch);

    expect(await screen.findByText('Morgan Member')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalled();
    for (const [path, init] of authenticatedApiFetch.mock.calls) {
      expect(path).toBe('/me/profile');
      expect(init?.method ?? 'GET').toBe('GET');
    }
  });

  test('signs out when the button is pressed', async () => {
    const session = mockSession({
      authenticatedApiFetch: mockApiFetch({
        'GET /me/profile': profileRoute(),
      }),
    });

    renderWithProviders(<ProfileScreen />);

    fireEvent.press(await screen.findByRole('button', { name: 'Sign out' }));

    expect(session.signOut).toHaveBeenCalledTimes(1);
  });

  test('disables the button and relabels it while signing out', async () => {
    mockSession({
      authenticatedApiFetch: mockApiFetch({
        'GET /me/profile': profileRoute(),
      }),
      status: 'signing-out',
    });

    renderWithProviders(<ProfileScreen />);

    expect(
      await screen.findByRole('button', { name: 'Sign out' }),
    ).toBeDisabled();
    expect(screen.getByText('Signing out...')).toBeTruthy();
  });

  test('shows the environment footer outside production', async () => {
    runtimeConfig.environmentName = 'integration';

    renderProfileScreen(mockApiFetch({ 'GET /me/profile': profileRoute() }));

    expect(await screen.findByTestId('environment-footer')).toHaveTextContent(
      'Environment: integration',
    );
  });

  test('hides the environment footer in production', async () => {
    runtimeConfig.environmentName = 'production';

    renderProfileScreen(mockApiFetch({ 'GET /me/profile': profileRoute() }));

    expect(await screen.findByText('Morgan Member')).toBeTruthy();
    expect(screen.queryByTestId('environment-footer')).toBeNull();
  });
});
