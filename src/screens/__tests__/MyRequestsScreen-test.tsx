import {
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import type { ApiFetch } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { MyRequestsScreen } from '../MyRequestsScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useFocusEffect: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const push = jest.fn();

const REQUEST_ID = 'a1111111-1111-4111-8111-111111111111';
const SECOND_REQUEST_ID = 'b2222222-2222-4222-8222-222222222222';

const viewer = {
  id: 'fake-user-1',
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
};

function pagination(overrides?: Record<string, unknown>) {
  return {
    page: 1,
    per_page: 20,
    total: 1,
    pages: 1,
    has_next: false,
    has_prev: false,
    ...overrides,
  };
}

function request(overrides?: Record<string, unknown>) {
  return {
    id: REQUEST_ID,
    title: 'Looking for a ladder',
    description: null,
    seeking: 'loan',
    visibility: 'circles',
    status: 'open',
    expires_at: '2099-06-03T00:00:00+00:00',
    fulfilled_at: null,
    created_at: '2026-05-01T12:00:00+00:00',
    user: viewer,
    ...overrides,
  };
}

function requestPage(
  requests: Record<string, unknown>[],
  paginationOverrides?: Record<string, unknown>,
) {
  return jsonResponse({
    requests,
    pagination: pagination(paginationOverrides),
  });
}

function renderScreen(authenticatedApiFetch: jest.MockedFunction<ApiFetch>) {
  mockSession({
    authenticatedApiFetch,
    user: {
      ...viewer,
      email: 'fake.member@example.com',
      email_confirmed: true,
    },
  });

  return renderWithProviders(<MyRequestsScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push,
  } as unknown as ReturnType<typeof useRouter>);
});

describe('MyRequestsScreen', () => {
  test('shows a spinner, then the rows for page 1 of active', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const authenticatedApiFetch = jest.fn(
      (_path: string) =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as jest.MockedFunction<ApiFetch>;

    renderScreen(authenticatedApiFetch);

    expect(await screen.findByLabelText('Loading requests')).toBeTruthy();

    resolveFetch(requestPage([request()]));
    await waitForElementToBeRemoved(
      () => screen.queryByLabelText('Loading requests'),
      { timeout: 3000 },
    );

    expect(await screen.findByText('Looking for a ladder')).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe(
      '/me/requests?status=active&page=1',
    );
  });

  test('switching to Fulfilled requests the fulfilled status', async () => {
    const authenticatedApiFetch = jest.fn(async (path: string) =>
      path === '/me/requests?status=fulfilled&page=1'
        ? requestPage([
            request({
              id: SECOND_REQUEST_ID,
              title: 'Wanted a tent',
              status: 'fulfilled',
              fulfilled_at: '2026-05-10T00:00:00+00:00',
            }),
          ])
        : requestPage([request()]),
    ) as jest.MockedFunction<ApiFetch>;

    renderScreen(authenticatedApiFetch);

    expect(await screen.findByText('Looking for a ladder')).toBeTruthy();

    fireEvent.press(screen.getByText('Fulfilled'));

    expect(await screen.findByText('Wanted a tent')).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls.map(([path]) => path)).toContain(
      '/me/requests?status=fulfilled&page=1',
    );
  });

  test('shows the empty copy for each status', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      requestPage([]),
    ) as jest.MockedFunction<ApiFetch>;

    const { queryClient } = renderScreen(authenticatedApiFetch);

    expect(await screen.findByText('No active requests')).toBeTruthy();
    expect(
      screen.getByText(
        "Things you're looking for show up here while they're open. Post a request on meutch.com.",
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByText('Fulfilled'));

    expect(await screen.findByText('Nothing fulfilled recently')).toBeTruthy();
    expect(
      screen.getByText(
        'Requests you marked fulfilled in the last 90 days show up here.',
      ),
    ).toBeTruthy();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  test('shows offline copy and retries on request', async () => {
    const authenticatedApiFetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(
        requestPage([request()]),
      ) as jest.MockedFunction<ApiFetch>;

    const { queryClient } = renderScreen(authenticatedApiFetch);

    expect(await screen.findByText('You appear to be offline')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText('Looking for a ladder')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  test('loads page 2 when the end is reached and has_next is set', async () => {
    const authenticatedApiFetch = jest.fn(async (path: string) => {
      if (path === '/me/requests?status=active&page=1') {
        return requestPage([request()], { has_next: true });
      }

      if (path === '/me/requests?status=active&page=2') {
        return requestPage(
          [request({ id: SECOND_REQUEST_ID, title: 'Wanted a tent' })],
          { page: 2 },
        );
      }

      throw new Error(`Unexpected request: ${path}`);
    }) as jest.MockedFunction<ApiFetch>;

    renderScreen(authenticatedApiFetch);

    expect(await screen.findByText('Looking for a ladder')).toBeTruthy();

    fireEvent(screen.getByTestId('my-requests-list'), 'endReached');

    expect(await screen.findByText('Wanted a tent')).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls[1][0]).toBe(
      '/me/requests?status=active&page=2',
    );
  });

  test('tapping a row opens the request', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      requestPage([request()]),
    ) as jest.MockedFunction<ApiFetch>;

    renderScreen(authenticatedApiFetch);

    fireEvent.press(await screen.findByLabelText('Looking for a ladder'));

    expect(push).toHaveBeenCalledWith(`/request/${REQUEST_ID}`);
  });

  test('pull-to-refresh re-requests only the first page', async () => {
    const authenticatedApiFetch = jest.fn(async (path: string) => {
      if (path === '/me/requests?status=active&page=2') {
        return requestPage(
          [request({ id: SECOND_REQUEST_ID, title: 'Wanted a tent' })],
          { page: 2 },
        );
      }

      return requestPage([request()], { has_next: true });
    }) as jest.MockedFunction<ApiFetch>;

    const { queryClient } = renderScreen(authenticatedApiFetch);

    expect(await screen.findByText('Looking for a ladder')).toBeTruthy();

    const list = screen.getByTestId('my-requests-list');
    fireEvent(list, 'endReached');
    expect(await screen.findByText('Wanted a tent')).toBeTruthy();

    fireEvent(list, 'refresh');

    await waitFor(
      () => expect(authenticatedApiFetch).toHaveBeenCalledTimes(3),
      { timeout: 3000 },
    );
    expect(authenticatedApiFetch.mock.calls[2][0]).toBe(
      '/me/requests?status=active&page=1',
    );
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });
});
