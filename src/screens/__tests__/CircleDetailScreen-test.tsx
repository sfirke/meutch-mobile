import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import type { ApiFetch } from '../../lib/api';
import { circleKeys } from '../../lib/queryKeys';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  getRequestBody,
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { CircleDetailScreen } from '../CircleDetailScreen';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

jest.mock('expo-router', () => ({
  Stack: { Screen: jest.fn(() => null) },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const CIRCLE_ID = 'a1111111-1111-4111-8111-111111111111';
const DETAIL_PATH = `/circles/${CIRCLE_ID}`;
const JOIN_PATH = `${DETAIL_PATH}/join`;
const CANCEL_PATH = `${DETAIL_PATH}/cancel-request`;

function buildMember(index: number, isAdmin = false) {
  return {
    user: {
      id: `b${index}111111-1111-4111-8111-111111111111`,
      first_name: 'Fake',
      last_name: `Member${index}`,
      full_name: `Fake Member${index}`,
      profile_image_url: null,
    },
    joined_at: '2026-02-10T09:00:00+00:00',
    is_admin: isAdmin,
  };
}

const adaMember = {
  user: {
    id: 'c1111111-1111-4111-8111-111111111111',
    first_name: 'Ada',
    last_name: 'Example',
    full_name: 'Ada Example',
    profile_image_url: null,
  },
  joined_at: '2026-01-20T09:00:00+00:00',
  is_admin: true,
};

type CirclePayload = Record<string, unknown>;

function buildCircle(overrides: CirclePayload = {}): CirclePayload {
  return {
    id: CIRCLE_ID,
    name: 'Oak Street Tool Library',
    description: 'Shared tools for the block.',
    circle_type: 'open',
    is_regional: false,
    regional_radius_miles: null,
    created_at: '2026-01-15T09:00:00+00:00',
    image_url: null,
    requires_join_approval: false,
    member_count: 12,
    is_member: false,
    is_admin: false,
    has_pending_join_request: false,
    pending_join_request_count: 0,
    distance_miles: null,
    can_view_members: true,
    is_last_member: false,
    pending_join_request: null,
    members: [],
    members_total: 0,
    members_page: 1,
    members_pages: 1,
    ...overrides,
  };
}

function setParams(id: string | string[] | undefined) {
  jest
    .mocked(useLocalSearchParams)
    .mockReturnValue(id === undefined ? {} : { id });
}

type ApiMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

function renderScreen(apiFetch: ApiMock, id: string | string[] = CIRCLE_ID) {
  mockSession({ authenticatedApiFetch: apiFetch as unknown as ApiFetch });
  setParams(id);

  return renderWithProviders(<CircleDetailScreen />);
}

/** Answers the detail read, and every write with `writes`. */
function buildApi(
  circle: CirclePayload,
  writes: Record<string, () => Response | Promise<Response>> = {},
): ApiMock {
  return jest.fn(async (path: string, init?: RequestInit) => {
    if (path === DETAIL_PATH && (init?.method ?? 'GET') === 'GET') {
      return jsonResponse({ circle });
    }

    const write = writes[path];

    if (!write) {
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${path}`);
    }

    return write();
  }) as ApiMock;
}

function renderCircle(
  overrides: CirclePayload = {},
  writes: Record<string, () => Response | Promise<Response>> = {},
) {
  const apiFetch = buildApi(buildCircle(overrides), writes);
  const { queryClient } = renderScreen(apiFetch);

  return { apiFetch, queryClient };
}

function writeCalls(apiFetch: ApiMock): [string, RequestInit?][] {
  return apiFetch.mock.calls.filter(
    ([, init]) => (init?.method ?? 'GET') !== 'GET',
  );
}

function lastTitle(): unknown {
  const calls = jest.mocked(Stack.Screen).mock.calls;
  const lastCall = calls[calls.length - 1][0] as {
    options?: { title?: string };
  };

  return lastCall.options?.title;
}

function apiError(code: string, message: string, status: number): Response {
  return jsonResponse({ error: { code, message, details: {} } }, status);
}

/** Answers every request with the same failure. */
function buildFailingApi(response: () => Response): ApiMock {
  return jest.fn(async (_path: string, _init?: RequestInit) => response());
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<CircleDetailScreen />', () => {
  test('shows the loading state until the circle arrives', async () => {
    renderCircle();

    expect(screen.getByLabelText('Loading circle')).toBeTruthy();
    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();
  });

  test('requests the circle by id and renders its header', async () => {
    const { apiFetch } = renderCircle();

    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();
    expect(apiFetch.mock.calls[0][0]).toBe(DETAIL_PATH);
    expect(screen.getByText('Shared tools for the block.')).toBeTruthy();
    expect(screen.getByText('12 members')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();
    expect(lastTitle()).toBe('Oak Street Tool Library');
    expect(writeCalls(apiFetch)).toHaveLength(0);
  });

  test('describes the distance when the member is geocoded', async () => {
    renderCircle({ distance_miles: 3.25 });

    expect(await screen.findByText('about 3.3 mi away')).toBeTruthy();
  });

  test('omits the distance line when there is no distance', async () => {
    renderCircle();

    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();
    expect(screen.queryByText(/mi away/)).toBeNull();
  });

  test('names the radius of a regional circle', async () => {
    renderCircle({ is_regional: true, regional_radius_miles: 10 });

    expect(
      await screen.findByText('Regional circle · 10-mile radius'),
    ).toBeTruthy();
  });

  test('omits the radius when a regional circle has none', async () => {
    renderCircle({ is_regional: true, regional_radius_miles: null });

    expect(await screen.findByText('Regional circle')).toBeTruthy();
  });

  test('lists the first page of members with a count footer', async () => {
    const members = [
      adaMember,
      ...Array.from({ length: 19 }, (_, index) => buildMember(index + 1)),
    ];

    renderCircle({
      can_view_members: true,
      members,
      members_total: 45,
      members_pages: 3,
    });

    expect(await screen.findByText('Ada Example')).toBeTruthy();
    expect(screen.getByText('Fake Member19')).toBeTruthy();
    expect(screen.getByText('Showing 20 of 45 members')).toBeTruthy();
  });

  test('shows more members on tap until the last page', async () => {
    const firstPage = [
      adaMember,
      ...Array.from({ length: 19 }, (_, index) => buildMember(index + 1)),
    ];
    const secondPage = [buildMember(20), buildMember(21)];
    const apiFetch = buildApi(
      buildCircle({ members: firstPage, members_total: 22, members_pages: 2 }),
      {
        [`${DETAIL_PATH}?members_page=2`]: () =>
          jsonResponse({
            circle: buildCircle({
              members: secondPage,
              members_total: 22,
              members_page: 2,
              members_pages: 2,
            }),
          }),
      },
    );

    renderScreen(apiFetch);

    expect(await screen.findByText('Showing 20 of 22 members')).toBeTruthy();
    fireEvent.press(screen.getByTestId('show-more-members'));

    expect(await screen.findByText('Fake Member21')).toBeTruthy();
    expect(screen.getByText('Ada Example')).toBeTruthy();
    expect(screen.queryByText(/Showing/)).toBeNull();
    expect(screen.queryByTestId('show-more-members')).toBeNull();
  });

  test('offers a retry when the next members page fails', async () => {
    let failures = 1;
    const apiFetch = buildApi(
      buildCircle({
        members: [adaMember],
        members_total: 2,
        members_pages: 2,
      }),
      {
        [`${DETAIL_PATH}?members_page=2`]: () => {
          if (failures > 0) {
            failures -= 1;
            return apiError('INTERNAL_ERROR', 'Something broke.', 500);
          }

          return jsonResponse({
            circle: buildCircle({
              members: [buildMember(1)],
              members_total: 2,
              members_page: 2,
              members_pages: 2,
            }),
          });
        },
      },
    );

    renderScreen(apiFetch);

    fireEvent.press(await screen.findByTestId('show-more-members'));
    fireEvent.press(await screen.findByLabelText('Try again'));

    expect(await screen.findByText('Fake Member1')).toBeTruthy();
    expect(screen.getByText('Ada Example')).toBeTruthy();
  });

  test('omits the footer when every member is on screen', async () => {
    renderCircle({ members: [adaMember], members_total: 1 });

    expect(await screen.findByText('Ada Example')).toBeTruthy();
    expect(screen.queryByText(/Showing/)).toBeNull();
  });

  test('hides the member list of a closed circle from a non-member', async () => {
    renderCircle({
      circle_type: 'closed',
      can_view_members: false,
      members: [],
      members_total: 30,
    });

    expect(await screen.findByText("Join to see who's here")).toBeTruthy();
    expect(screen.queryByText('Ada Example')).toBeNull();
  });

  test('refetches when the member pulls to refresh', async () => {
    const { apiFetch } = renderCircle();

    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();

    fireEvent(screen.getByTestId('circle-detail-scroll'), 'refresh');

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
  });
});

describe('<CircleDetailScreen /> membership states', () => {
  test('tells an admin where the admin tools live', async () => {
    renderCircle({ is_member: true, is_admin: true });

    expect(await screen.findByText("You're an admin")).toBeTruthy();
    expect(
      screen.getByText('Manage members and requests on meutch.com.'),
    ).toBeTruthy();
    expect(screen.queryByTestId('membership-action')).toBeNull();
  });

  test('tells a member where to leave', async () => {
    renderCircle({ is_member: true });

    expect(await screen.findByText("You're a member")).toBeTruthy();
    expect(screen.getByText('Leave this circle on meutch.com.')).toBeTruthy();
    expect(screen.queryByTestId('membership-action')).toBeNull();
  });

  test('offers to cancel a pending request', async () => {
    renderCircle({ circle_type: 'closed', has_pending_join_request: true });

    expect(await screen.findByText('Request pending')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel request' })).toBeTruthy();
  });

  test('offers an immediate join for an open circle', async () => {
    renderCircle();

    expect(
      await screen.findByRole('button', { name: 'Join circle' }),
    ).toBeTruthy();
  });

  test('offers a join request for a closed circle', async () => {
    renderCircle({ circle_type: 'closed', can_view_members: false });

    expect(
      await screen.findByRole('button', { name: 'Request to join' }),
    ).toBeTruthy();
    expect(screen.getByText('Closed circle')).toBeTruthy();
  });
});

describe('<CircleDetailScreen /> joining', () => {
  test('joins an open circle and confirms it', async () => {
    const { apiFetch, queryClient } = renderCircle(
      {},
      {
        [JOIN_PATH]: () =>
          jsonResponse({ membership_status: 'member', join_request: null }),
      },
    );
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    fireEvent.press(await screen.findByRole('button', { name: 'Join circle' }));

    expect(await screen.findByTestId('membership-feedback')).toHaveTextContent(
      "You've joined",
    );

    const writes = writeCalls(apiFetch);

    expect(writes).toHaveLength(1);
    expect(writes[0][0]).toBe(JOIN_PATH);
    expect(writes[0][1]?.method).toBe('POST');
    expect(getRequestBody(writes[0][1])).toEqual({});
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: circleKeys.all,
    });
  });

  test('sends a typed message with a join request', async () => {
    const { apiFetch } = renderCircle(
      { circle_type: 'closed', can_view_members: false },
      {
        [JOIN_PATH]: () =>
          jsonResponse({
            membership_status: 'pending',
            join_request: {
              id: 'd1111111-1111-4111-8111-111111111111',
              message: 'We live next door.',
              status: 'pending',
              created_at: '2026-03-01T09:00:00+00:00',
            },
          }),
      },
    );

    fireEvent.press(
      await screen.findByRole('button', { name: 'Request to join' }),
    );
    fireEvent.changeText(
      screen.getByLabelText('Message to the admins'),
      '  We live next door.  ',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Send request' }));

    expect(await screen.findByTestId('membership-feedback')).toHaveTextContent(
      'Request sent',
    );

    const writes = writeCalls(apiFetch);

    expect(writes).toHaveLength(1);
    expect(writes[0][0]).toBe(JOIN_PATH);
    expect(getRequestBody(writes[0][1])).toEqual({
      message: 'We live next door.',
    });
  });

  test('sends an empty body when the message is left blank', async () => {
    const { apiFetch } = renderCircle(
      { circle_type: 'closed', can_view_members: false },
      {
        [JOIN_PATH]: () =>
          jsonResponse({ membership_status: 'pending', join_request: null }),
      },
    );

    fireEvent.press(
      await screen.findByRole('button', { name: 'Request to join' }),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Send request' }));

    expect(await screen.findByTestId('membership-feedback')).toHaveTextContent(
      'Request sent',
    );
    expect(getRequestBody(writeCalls(apiFetch)[0][1])).toEqual({});
  });

  test('closing the sheet sends nothing', async () => {
    const { apiFetch } = renderCircle({
      circle_type: 'closed',
      can_view_members: false,
    });

    fireEvent.press(
      await screen.findByRole('button', { name: 'Request to join' }),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.getByRole('button', { name: 'Request to join' }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Message to the admins')).toBeNull();
    expect(writeCalls(apiFetch)).toHaveLength(0);
  });

  test('cancels a pending request with an empty POST', async () => {
    const { apiFetch } = renderCircle(
      { circle_type: 'closed', has_pending_join_request: true },
      { [CANCEL_PATH]: () => jsonResponse({ canceled: true }) },
    );

    fireEvent.press(
      await screen.findByRole('button', { name: 'Cancel request' }),
    );

    expect(await screen.findByTestId('membership-feedback')).toHaveTextContent(
      'Request cancelled',
    );

    const writes = writeCalls(apiFetch);

    expect(writes).toHaveLength(1);
    expect(writes[0][0]).toBe(CANCEL_PATH);
    expect(writes[0][1]?.method).toBe('POST');
    expect(writes[0][1]?.body).toBeUndefined();
  });

  test('keeps the cancel button after a failed cancel', async () => {
    renderCircle(
      { circle_type: 'closed', has_pending_join_request: true },
      {
        [CANCEL_PATH]: () =>
          apiError(
            'BAD_REQUEST',
            'You have no pending join request for this circle.',
            400,
          ),
      },
    );

    fireEvent.press(
      await screen.findByRole('button', { name: 'Cancel request' }),
    );

    expect(await screen.findByTestId('membership-feedback')).toHaveTextContent(
      'You have no pending join request for this circle.',
    );
    expect(
      screen.getByRole('button', { name: 'Cancel request' }),
    ).toBeEnabled();
  });

  test('disables the join button while the request is in flight', async () => {
    let resolveJoin: (response: Response) => void = () => undefined;

    renderCircle(
      {},
      {
        [JOIN_PATH]: () =>
          new Promise<Response>((resolve) => {
            resolveJoin = resolve;
          }),
      },
    );

    fireEvent.press(await screen.findByRole('button', { name: 'Join circle' }));

    const button = await screen.findByRole('button', { name: 'Joining...' });

    expect(button).toBeDisabled();

    // Settle the request so nothing is left pending after the test.
    resolveJoin(
      jsonResponse({ membership_status: 'member', join_request: null }),
    );

    expect(await screen.findByText("You've joined")).toBeTruthy();
  });

  test('shows the backend message when the member already joined', async () => {
    renderCircle(
      {},
      {
        [JOIN_PATH]: () =>
          apiError(
            'BAD_REQUEST',
            'You are already a member of this circle.',
            400,
          ),
      },
    );

    fireEvent.press(await screen.findByRole('button', { name: 'Join circle' }));

    expect(await screen.findByTestId('membership-feedback')).toHaveTextContent(
      'You are already a member of this circle.',
    );
    expect(screen.getByRole('button', { name: 'Join circle' })).toBeEnabled();
  });

  test('shows maintenance copy when writes are disabled', async () => {
    renderCircle(
      {},
      {
        [JOIN_PATH]: () =>
          apiError('API_READ_ONLY', 'Writes are disabled.', 503),
      },
    );

    fireEvent.press(await screen.findByRole('button', { name: 'Join circle' }));

    expect(await screen.findByTestId('membership-feedback')).toHaveTextContent(
      "We're doing some maintenance. Please try again soon.",
    );
    expect(screen.getByRole('button', { name: 'Join circle' })).toBeEnabled();
  });
});

describe('<CircleDetailScreen /> errors', () => {
  test('explains a 404 without a retry and without saying deleted', async () => {
    const apiFetch = buildFailingApi(() =>
      apiError('NOT_FOUND', 'Circle not found.', 404),
    );

    renderScreen(apiFetch);

    expect(await screen.findByText("This circle isn't available")).toBeTruthy();
    expect(
      screen.getByText('It may be private, or the link may be out of date.'),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
    expect(screen.queryByText(/deleted/i)).toBeNull();
    expect(lastTitle()).toBe('Circle');
  });

  test('offers a retry when the device is offline', async () => {
    const apiFetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(
        jsonResponse({ circle: buildCircle() }),
      ) as ApiMock;

    renderScreen(apiFetch);

    expect(await screen.findByText('You appear to be offline')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();
  });

  test('shows rate-limit copy for a 429 response', async () => {
    const apiFetch = buildFailingApi(() =>
      apiError('RATE_LIMIT_EXCEEDED', 'Too many requests.', 429),
    );

    renderScreen(apiFetch);

    expect(await screen.findByText('Slow down')).toBeTruthy();
  });
});

describe('<CircleDetailScreen /> route params', () => {
  test('rejects an id that is not a uuid without a request', async () => {
    const apiFetch = jest.fn() as ApiMock;

    renderScreen(apiFetch, 'not-a-uuid');

    expect(await screen.findByText("This circle isn't available")).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
    expect(lastTitle()).toBe('Circle');
  });

  test('uses the first value when the id arrives repeated', async () => {
    const apiFetch = buildApi(buildCircle());

    renderScreen(apiFetch, [CIRCLE_ID, 'second']);

    expect(await screen.findByText('Oak Street Tool Library')).toBeTruthy();
    expect(apiFetch.mock.calls[0][0]).toBe(DETAIL_PATH);
  });
});
