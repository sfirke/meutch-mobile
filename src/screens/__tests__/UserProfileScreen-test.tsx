import { fireEvent, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import type { UserProfileResponse } from '../../lib/users';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { UserProfileScreen } from '../UserProfileScreen';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: jest.fn(() => null) },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const USER_ID = 'a1111111-1111-4111-8111-111111111111';
const CIRCLE_ID = 'b2222222-2222-4222-8222-222222222222';

function buildProfile(
  overrides?: Partial<UserProfileResponse>,
): UserProfileResponse {
  return {
    user: {
      id: USER_ID,
      first_name: 'Ana',
      last_name: 'Example',
      full_name: 'Ana Example',
      profile_image_url: null,
      about_me: 'I love lending tools.',
      web_links: [
        {
          id: 'link-1',
          platform_type: 'website',
          platform_name: 'Website',
          display_name: 'anaexample.com',
          url: 'https://anaexample.com',
          display_order: 0,
        },
      ],
    },
    shared_circles: [
      {
        id: CIRCLE_ID,
        name: 'Oak Street',
        circle_type: 'open',
        image_url: null,
      },
    ],
    access_reason: 'conversation',
    ...overrides,
  };
}

function mockFetch() {
  const authenticatedApiFetch = jest.fn();

  mockSession({ authenticatedApiFetch });

  return authenticatedApiFetch;
}

function setParams(id: string | string[] | undefined) {
  jest
    .mocked(useLocalSearchParams)
    .mockReturnValue(id === undefined ? {} : { id });
}

function renderScreen(overrides?: Partial<UserProfileResponse>) {
  const authenticatedApiFetch = mockFetch();
  const profile = buildProfile(overrides);

  authenticatedApiFetch.mockResolvedValue(jsonResponse(profile));
  setParams(USER_ID);
  renderWithProviders(<UserProfileScreen />);

  return { authenticatedApiFetch, profile };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<UserProfileScreen />', () => {
  test('shows a loading state', () => {
    renderScreen();

    expect(screen.getByLabelText('Loading profile')).toBeTruthy();
  });

  test('requests the profile by id and renders its details', async () => {
    const { authenticatedApiFetch } = renderScreen();

    expect(await screen.findByText('Ana Example')).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe(`/users/${USER_ID}`);
    expect(screen.getByText('I love lending tools.')).toBeTruthy();
    expect(screen.getByText('anaexample.com')).toBeTruthy();
    expect(screen.getByText('Oak Street')).toBeTruthy();
    expect(
      screen.getByText(
        'You can view this profile because you and Ana have a message thread.',
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('link', { name: 'Oak Street' }));

    expect(mockPush).toHaveBeenCalledWith(`/circle/${CIRCLE_ID}`);
  });

  test('shows no access note for a shared circle', async () => {
    renderScreen({ access_reason: 'circle' });

    expect(await screen.findByText('Ana Example')).toBeTruthy();
    expect(screen.queryByText(/You can view this profile/)).toBeNull();
  });

  test('explains a 404 without offering a retry', async () => {
    const authenticatedApiFetch = mockFetch();

    authenticatedApiFetch.mockResolvedValue(
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'Gone.' } }, 404),
    );
    setParams(USER_ID);
    renderWithProviders(<UserProfileScreen />);

    expect(
      await screen.findByText("This profile isn't available."),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
  });

  test('retries a generic error and refetches', async () => {
    const authenticatedApiFetch = mockFetch();

    authenticatedApiFetch.mockResolvedValueOnce(
      jsonResponse({ error: { code: 'UNKNOWN', message: 'Boom.' } }, 500),
    );
    setParams(USER_ID);
    renderWithProviders(<UserProfileScreen />);

    expect(await screen.findByLabelText('Try again')).toBeTruthy();

    authenticatedApiFetch.mockResolvedValueOnce(jsonResponse(buildProfile()));
    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText('Ana Example')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
  });

  test('shows the missing state for an id that is not a uuid', async () => {
    const authenticatedApiFetch = mockFetch();

    setParams('not-a-uuid');
    renderWithProviders(<UserProfileScreen />);

    expect(await screen.findByText('Profile not found')).toBeTruthy();
    expect(
      await screen.findByText("This profile isn't available."),
    ).toBeTruthy();
    expect(authenticatedApiFetch).not.toHaveBeenCalled();
  });
});
