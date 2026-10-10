import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import type { ApiFetch } from '../../lib/api';
import { RequestTimeoutError } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  defaultProfileFixture,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { LocationScreen } from '../LocationScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

jest.mock('expo-router', () => ({ Stack: { Screen: jest.fn(() => null) } }));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const ADDRESS = {
  street: '1 Example Street',
  city: 'Springfield',
  state: 'Example State',
  zip_code: '00000',
  country: 'Example Country',
};

const FIELDS = Object.keys(ADDRESS) as (keyof typeof ADDRESS)[];

type ProfileFixture = typeof defaultProfileFixture;

function profileRoute(overrides?: Partial<ProfileFixture>) {
  return { user: { ...defaultProfileFixture, ...overrides } };
}

function locationResponse(status: string, hasLocation = false) {
  return {
    status,
    user: { has_location: hasLocation, geocoding_failed: false },
  };
}

function renderLocationScreen(authenticatedApiFetch: ApiFetch) {
  mockSession({ authenticatedApiFetch });

  return renderWithProviders(<LocationScreen />);
}

function saveButton() {
  return screen.getByRole('button', { name: /Save location|Finding/ });
}

function fillAddress(values: Partial<Record<string, string>> = ADDRESS) {
  for (const field of FIELDS) {
    fireEvent.changeText(
      screen.getByTestId(`field-${field}`),
      values[field] ?? '',
    );
  }
}

function countCalls(
  fetch: jest.Mock<unknown, [string, RequestInit?]>,
  method: string,
  path: string,
) {
  return fetch.mock.calls.filter(
    ([callPath, init]) =>
      callPath === path && (init?.method ?? 'GET').toUpperCase() === method,
  ).length;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('location screen', () => {
  test('shows the status, notes and an empty form without a location', async () => {
    renderLocationScreen(mockApiFetch({ 'GET /me/profile': profileRoute() }));

    expect(await screen.findByTestId('location-status')).toHaveTextContent(
      'No location set',
    );
    expect(
      screen.getByText(
        'Your exact location is never shown to other members. They only see approximate distances.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Location updates are limited to once per day.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('field-street').props.value).toBe('');
    expect(
      screen.queryByRole('button', { name: 'Remove location' }),
    ).not.toBeOnTheScreen();
  });

  test('shows the location-set status and the remove button', async () => {
    renderLocationScreen(
      mockApiFetch({ 'GET /me/profile': profileRoute({ has_location: true }) }),
    );

    expect(await screen.findByTestId('location-status')).toHaveTextContent(
      'Location set',
    );
    expect(
      screen.getByRole('button', { name: 'Remove location' }),
    ).toBeOnTheScreen();
  });

  test('shows the geocoding failure status', async () => {
    renderLocationScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute({ geocoding_failed: true }),
      }),
    );

    expect(await screen.findByTestId('location-status')).toHaveTextContent(
      "We couldn't determine your location",
    );
  });

  test('keeps Save disabled until all five fields are filled', async () => {
    renderLocationScreen(mockApiFetch({ 'GET /me/profile': profileRoute() }));
    await screen.findByTestId('location-status');

    expect(saveButton()).toBeDisabled();

    for (const field of FIELDS.slice(0, 4)) {
      fireEvent.changeText(
        screen.getByTestId(`field-${field}`),
        ADDRESS[field],
      );
    }

    expect(saveButton()).toBeDisabled();

    fireEvent.changeText(screen.getByTestId('field-country'), ADDRESS.country);

    expect(saveButton()).toBeEnabled();
  });

  test('flags whitespace-only fields as required without a request', async () => {
    const fetch = mockApiFetch({ 'GET /me/profile': profileRoute() });

    renderLocationScreen(fetch);
    await screen.findByTestId('location-status');
    fillAddress({ ...ADDRESS, city: '   ', zip_code: ' ' });
    fireEvent.press(saveButton());

    expect(screen.getByTestId('field-error-city')).toHaveTextContent(
      'Required',
    );
    expect(screen.getByTestId('field-error-zip_code')).toHaveTextContent(
      'Required',
    );
    expect(screen.queryByTestId('field-error-street')).not.toBeOnTheScreen();
    expect(countCalls(fetch, 'PATCH', '/me/location')).toBe(0);

    fireEvent.changeText(screen.getByTestId('field-city'), 'Springfield');

    expect(screen.queryByTestId('field-error-city')).not.toBeOnTheScreen();
  });

  test('submits the trimmed address and clears the form on success', async () => {
    let resolvePatch: (response: Response) => void = () => undefined;
    const base = mockApiFetch({ 'GET /me/profile': profileRoute() });
    const fetch = jest.fn((path: string, init?: RequestInit) =>
      path === '/me/location'
        ? new Promise<Response>((resolve) => {
            resolvePatch = resolve;
          })
        : base(path, init),
    );

    renderLocationScreen(fetch as unknown as ApiFetch);
    await screen.findByTestId('location-status');
    fillAddress({ ...ADDRESS, street: '  1 Example Street  ' });
    fireEvent.press(saveButton());

    expect(
      await screen.findByText('Finding your location...'),
    ).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();

    const patchCall = fetch.mock.calls.find(
      ([path]) => path === '/me/location',
    );

    expect(getRequestBody(patchCall?.[1])).toEqual({
      location_method: 'address',
      ...ADDRESS,
    });

    resolvePatch(jsonResponse(locationResponse('success', true)));

    expect(
      within(await screen.findByTestId('location-result')).getByText(
        'Your location has been updated.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('field-street').props.value).toBe('');
    expect(screen.getByTestId('field-zip_code').props.value).toBe('');
    await waitFor(() =>
      expect(screen.getByTestId('location-status')).toHaveTextContent(
        'Location set',
      ),
    );
  });

  test('keeps the fields when the update is rate limited', async () => {
    renderLocationScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute(),
        'PATCH /me/location': locationResponse('rate_limited'),
      }),
    );
    await screen.findByTestId('location-status');
    fillAddress();
    fireEvent.press(saveButton());

    expect(
      within(await screen.findByTestId('location-result')).getByText(
        'You can only update your location once per day. Please try again tomorrow.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('field-street').props.value).toBe(ADDRESS.street);
  });

  test('shows the geocoding failure warning and keeps the fields', async () => {
    renderLocationScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute(),
        'PATCH /me/location': locationResponse('geocoding_failed'),
      }),
    );
    await screen.findByTestId('location-status');
    fillAddress();
    fireEvent.press(saveButton());

    expect(
      within(await screen.findByTestId('location-result')).getByText(
        "We couldn't determine your location from that address. Check the address and try again.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('field-city').props.value).toBe(ADDRESS.city);

    fireEvent.changeText(screen.getByTestId('field-city'), 'Shelbyville');

    expect(screen.queryByTestId('location-result')).not.toBeOnTheScreen();
  });

  test('renders a 422 message under the postal code field', async () => {
    renderLocationScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute(),
        'PATCH /me/location': jsonResponse(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input.',
              details: { zip_code: ['Enter a valid postal code.'] },
            },
          },
          422,
        ),
      }),
    );
    await screen.findByTestId('location-status');
    fillAddress();
    fireEvent.press(saveButton());

    expect(await screen.findByTestId('field-error-zip_code')).toHaveTextContent(
      'Enter a valid postal code.',
    );
    expect(screen.queryByTestId('location-error')).not.toBeOnTheScreen();
  });

  test('shows the timeout copy and refetches the profile', async () => {
    const fetch = mockApiFetch({
      'GET /me/profile': profileRoute(),
      'PATCH /me/location': () => {
        throw new RequestTimeoutError();
      },
    });

    renderLocationScreen(fetch);
    await screen.findByTestId('location-status');
    expect(countCalls(fetch, 'GET', '/me/profile')).toBe(1);

    fillAddress();
    fireEvent.press(saveButton());

    expect(await screen.findByTestId('location-error')).toHaveTextContent(
      'Check your connection and try again.',
    );
    await waitFor(() =>
      expect(countCalls(fetch, 'GET', '/me/profile')).toBe(2),
    );
  });

  test('removes the location after confirming', async () => {
    const fetch = mockApiFetch({
      'GET /me/profile': profileRoute({ has_location: true }),
      'PATCH /me/location': locationResponse('removed'),
    });

    renderLocationScreen(fetch);
    fireEvent.press(
      await screen.findByRole('button', { name: 'Remove location' }),
    );

    const dialog = screen.getByTestId('confirm-dialog');

    expect(within(dialog).getByText('Remove your location?')).toBeOnTheScreen();
    expect(countCalls(fetch, 'PATCH', '/me/location')).toBe(0);

    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    expect(
      within(await screen.findByTestId('location-result')).getByText(
        'Your location has been removed.',
      ),
    ).toBeOnTheScreen();

    const patchCall = fetch.mock.calls.find(
      ([path]) => path === '/me/location',
    );

    expect(getRequestBody(patchCall?.[1])).toEqual({
      location_method: 'remove',
    });
    await waitFor(() =>
      expect(screen.queryByTestId('confirm-dialog')).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId('location-status')).toHaveTextContent(
      'No location set',
    );
  });

  test('shows the rate-limited message when removal is blocked', async () => {
    renderLocationScreen(
      mockApiFetch({
        'GET /me/profile': profileRoute({ has_location: true }),
        'PATCH /me/location': locationResponse('rate_limited', true),
      }),
    );

    fireEvent.press(
      await screen.findByRole('button', { name: 'Remove location' }),
    );
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    expect(
      within(await screen.findByTestId('location-result')).getByText(
        'You can only update your location once per day. Please try again tomorrow.',
      ),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.queryByTestId('confirm-dialog')).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId('location-status')).toHaveTextContent(
      'Location set',
    );
  });
});
