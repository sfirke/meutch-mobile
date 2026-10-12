import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';

import type {
  ItemDetail,
  ItemImage,
  ItemViewerState,
  UserSummary,
} from '../../lib/items';
import { itemKeys } from '../../lib/queryKeys';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  getRequestBody,
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { ItemDetailScreen } from '../ItemDetailScreen';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock('expo-router', () => ({
  Stack: { Screen: jest.fn(() => null) },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const ITEM_ID = 'b2222222-2222-4222-8222-222222222222';
const MESSAGE_ID = 'aa222222-2222-4222-8222-222222222222';
const GIVEAWAY_HINT =
  'Ask a question or express your interest. The owner can pick anyone who sends them a message.';

const owner: UserSummary = {
  id: 'a1111111-1111-4111-8111-111111111111',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
  profile_viewable: false,
};

const borrower: UserSummary = {
  id: 'e5555555-5555-4555-8555-555555555555',
  first_name: 'Bo',
  last_name: 'Sample',
  full_name: 'Bo Sample',
  profile_image_url: null,
  profile_viewable: false,
};

const recipient: UserSummary = {
  id: 'f6666666-6666-4666-8666-666666666666',
  first_name: 'Cy',
  last_name: 'Placeholder',
  full_name: 'Cy Placeholder',
  profile_image_url: null,
  profile_viewable: false,
};

function buildImage(id: string, position: number): ItemImage {
  return {
    id,
    url: `https://images.example.test/${id}.jpg`,
    position,
    created_at: '2026-05-26T18:30:00+00:00',
  };
}

function buildItem(overrides?: Partial<ItemDetail>): ItemDetail {
  return {
    id: ITEM_ID,
    name: 'Cordless drill',
    description: 'Charger included.',
    available: true,
    is_giveaway: false,
    giveaway_visibility: null,
    claim_status: null,
    created_at: '2026-05-26T18:30:00+00:00',
    image_url: 'https://images.example.test/img-0.jpg',
    owner,
    category: { id: 'c3333333-3333-4333-8333-333333333333', name: 'Tools' },
    tags: [{ id: 'd4444444-4444-4444-8444-444444444444', name: 'power' }],
    images: [buildImage('img-0', 0)],
    claimed_by: null,
    current_loan: null,
    viewer_interest_status: null,
    interested_count: null,
    ...overrides,
  };
}

function buildViewer(overrides?: Partial<ItemViewerState>): ItemViewerState {
  return {
    is_owner: false,
    shares_circle_with_owner: true,
    is_active_borrower: false,
    ...overrides,
  };
}

type RenderOptions = {
  id?: string | string[];
  item?: Partial<ItemDetail>;
  viewer?: Partial<ItemViewerState>;
  userId?: string;
};

const viewingUser = {
  id: 'fake-user-1',
  email: 'fake.member@example.com',
  email_confirmed: true,
  first_name: 'Fake',
  last_name: 'Member',
  full_name: 'Fake Member',
  profile_image_url: null,
};

function mockFetch(userId = viewingUser.id) {
  const authenticatedApiFetch = jest.fn();

  mockSession({
    authenticatedApiFetch,
    user: { ...viewingUser, id: userId },
  });

  return authenticatedApiFetch;
}

function setParams(id: string | string[] | undefined) {
  jest
    .mocked(useLocalSearchParams)
    .mockReturnValue(id === undefined ? {} : { id });
}

function renderScreen(options: RenderOptions = {}) {
  const item = buildItem(options.item);
  const viewer = buildViewer(options.viewer);
  const authenticatedApiFetch = mockFetch(options.userId);

  authenticatedApiFetch.mockResolvedValue(jsonResponse({ item, viewer }));
  setParams(options.id ?? ITEM_ID);
  const { queryClient } = renderWithProviders(<ItemDetailScreen />);

  return { authenticatedApiFetch, item, viewer, queryClient };
}

function expectOnlyReads(authenticatedApiFetch: jest.Mock) {
  for (const call of authenticatedApiFetch.mock.calls) {
    const init = call[1] as RequestInit | undefined;

    expect(init?.method ?? 'GET').toBe('GET');
  }
}

function lastTitle(): unknown {
  const calls = jest.mocked(Stack.Screen).mock.calls;
  const lastCall = calls[calls.length - 1][0] as {
    options?: { title?: string };
  };

  return lastCall.options?.title;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(true);
});

describe('<ItemDetailScreen />', () => {
  test('shows the loading state until the item arrives', async () => {
    const { item } = renderScreen();

    expect(screen.getByLabelText('Loading item')).toBeTruthy();

    expect(await screen.findByText(item.name)).toBeTruthy();
  });

  test('requests the item by id and renders its details', async () => {
    const { authenticatedApiFetch } = renderScreen();

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(1);
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe(`/items/${ITEM_ID}`);
    expect(screen.getByText('Charger included.')).toBeTruthy();
    expect(screen.getByText('Ada Example')).toBeTruthy();
    expect(screen.getByText('Tools')).toBeTruthy();
    expect(screen.getByText('power')).toBeTruthy();
    expectOnlyReads(authenticatedApiFetch);
  });

  test('omits the description when the item has none', async () => {
    renderScreen({ item: { description: null } });

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(screen.queryByText('Charger included.')).toBeNull();
  });

  test('marks the item as a giveaway', async () => {
    renderScreen({ item: { is_giveaway: true } });

    expect(await screen.findByText('GIVEAWAY')).toBeTruthy();
  });

  test('sets the header title from the item name', async () => {
    renderScreen();

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(lastTitle()).toBe('Cordless drill');
  });

  test('renders the carousel in position order with a page indicator', async () => {
    renderScreen({
      item: {
        images: [buildImage('img-0', 0), buildImage('img-1', 1)],
      },
    });

    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    const images = screen.getAllByTestId('item-carousel-image');

    expect(images.map((image) => image.props.source)).toEqual([
      [{ uri: 'https://images.example.test/img-0.jpg' }],
      [{ uri: 'https://images.example.test/img-1.jpg' }],
    ]);
    expect(screen.getByTestId('item-carousel-counter')).toHaveTextContent(
      '1 / 2',
    );
    expect(
      screen.getByLabelText('Photo 2 of 2 of Cordless drill'),
    ).toBeTruthy();
  });

  test('falls back to the photo placeholder when the item has no images', async () => {
    renderScreen({ item: { images: [], image_url: null } });

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(screen.getByTestId('image-placeholder')).toBeTruthy();
  });

  test('refetches when the member pulls to refresh', async () => {
    const { authenticatedApiFetch } = renderScreen();

    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    const scrollView = screen.getByTestId('item-detail-scroll');

    fireEvent(scrollView, 'refresh');

    await waitFor(() => {
      expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
    });
    expectOnlyReads(authenticatedApiFetch);
  });

  test('labels a deleted owner instead of failing to render', async () => {
    renderScreen({ item: { owner: null } });

    expect(await screen.findByText('Deleted User')).toBeTruthy();
    expect(screen.getByTestId('item-owner-avatar-initials')).toBeTruthy();
    expect(screen.queryByTestId('item-owner-avatar')).toBeNull();
  });

  test('links to the owner profile when viewable', async () => {
    renderScreen({ item: { owner: { ...owner, profile_viewable: true } } });

    expect(await screen.findByText('Ada Example')).toBeTruthy();

    fireEvent.press(screen.getByLabelText("View Ada Example's profile"));

    expect(mockPush).toHaveBeenCalledWith(`/user/${owner.id}`);
  });

  test('does not link to the owner profile when not viewable', async () => {
    renderScreen({ item: { owner: { ...owner, profile_viewable: false } } });

    expect(await screen.findByText('Ada Example')).toBeTruthy();
    expect(screen.queryByLabelText("View Ada Example's profile")).toBeNull();
  });
});

describe('<ItemDetailScreen /> status banner', () => {
  test('reads "Available" for an available item', async () => {
    renderScreen();

    expect(await screen.findByText('Available')).toBeTruthy();
  });

  test('shows the due date for a borrowed item', async () => {
    renderScreen({
      item: {
        available: false,
        current_loan: {
          id: 'aa111111-1111-4111-8111-111111111111',
          start_date: '2026-05-20',
          end_date: '2026-06-03',
          status: 'approved',
          borrower,
        },
      },
    });

    expect(await screen.findByText('Borrowed')).toBeTruthy();
    expect(screen.getByText('Due back Jun 3, 2026.')).toBeTruthy();
  });

  test('addresses the active borrower directly', async () => {
    renderScreen({
      viewer: { is_active_borrower: true },
      item: {
        available: false,
        current_loan: {
          id: 'aa111111-1111-4111-8111-111111111111',
          start_date: '2026-05-20',
          end_date: '2026-06-03',
          status: 'approved',
          borrower,
        },
      },
    });

    expect(
      await screen.findByText("You're borrowing this until Jun 3, 2026."),
    ).toBeTruthy();
  });

  test('omits the due date when there is no current loan', async () => {
    renderScreen({ item: { available: false } });

    expect(await screen.findByText('Borrowed')).toBeTruthy();
    expect(screen.queryByText(/Due back/)).toBeNull();
  });

  test('shows the recipient to the owner of a giveaway pending pickup', async () => {
    renderScreen({
      viewer: { is_owner: true, shares_circle_with_owner: false },
      item: {
        available: false,
        is_giveaway: true,
        claim_status: 'pending_pickup',
        claimed_by: recipient,
        interested_count: 3,
      },
    });

    expect(await screen.findByText('Pending Pickup')).toBeTruthy();
    expect(screen.getByText('Going to Cy Placeholder.')).toBeTruthy();
  });

  test('tells the selected member they were chosen', async () => {
    renderScreen({
      item: {
        available: false,
        is_giveaway: true,
        claim_status: 'pending_pickup',
        viewer_interest_status: 'selected',
      },
    });

    expect(
      await screen.findByText("You've been selected for this giveaway."),
    ).toBeTruthy();
  });

  test('reads "Rehomed" once the giveaway is claimed', async () => {
    renderScreen({
      item: {
        available: false,
        is_giveaway: true,
        claim_status: 'claimed',
      },
    });

    expect(await screen.findByText('Rehomed')).toBeTruthy();
    expect(
      screen.getByText('This giveaway has found a new home.'),
    ).toBeTruthy();
  });
});

describe('<ItemDetailScreen /> identity visibility', () => {
  test('never names the borrower of a loaned item', async () => {
    renderScreen({
      item: {
        available: false,
        current_loan: {
          id: 'aa111111-1111-4111-8111-111111111111',
          start_date: '2026-05-20',
          end_date: '2026-06-03',
          status: 'approved',
          borrower,
        },
      },
    });

    expect(await screen.findByText('Borrowed')).toBeTruthy();
    expect(screen.queryByText('Bo Sample')).toBeNull();
  });

  test('never names the borrower even to the owner', async () => {
    renderScreen({
      viewer: { is_owner: true, shares_circle_with_owner: false },
      item: {
        available: false,
        current_loan: {
          id: 'aa111111-1111-4111-8111-111111111111',
          start_date: '2026-05-20',
          end_date: '2026-06-03',
          status: 'approved',
          borrower,
        },
      },
    });

    expect(await screen.findByText('Borrowed')).toBeTruthy();
    expect(screen.queryByText('Bo Sample')).toBeNull();
  });

  test('never names the recipient to a member who is not the owner', async () => {
    renderScreen({
      item: {
        available: false,
        is_giveaway: true,
        claim_status: 'claimed',
        claimed_by: recipient,
      },
    });

    expect(await screen.findByText('Rehomed')).toBeTruthy();
    expect(screen.queryByText(/Cy Placeholder/)).toBeNull();
  });

  test('addresses the recipient without naming them', async () => {
    renderScreen({
      userId: recipient.id,
      item: {
        available: false,
        is_giveaway: true,
        claim_status: 'claimed',
        claimed_by: recipient,
      },
    });

    expect(await screen.findByText('You received this giveaway.')).toBeTruthy();
    expect(screen.queryByText(/Cy Placeholder/)).toBeNull();
  });
});

describe('<ItemDetailScreen /> affordances', () => {
  test('offers a disabled borrow request when the viewer shares a circle', async () => {
    const { authenticatedApiFetch } = renderScreen();

    const action = await screen.findByTestId('item-primary-action');

    expect(screen.getByText('Request to Borrow')).toBeTruthy();
    expect(action).toBeDisabled();
    expect(action.props.accessibilityState.disabled).toBe(true);
    expect(
      screen.getByText(
        'Borrow requests are coming to the app soon. For now, use meutch.com.',
      ),
    ).toBeTruthy();
    expectOnlyReads(authenticatedApiFetch);
  });

  test('offers no borrow request while the item is out on loan', async () => {
    renderScreen({ item: { available: false } });

    expect(
      await screen.findByText('This item is out on loan right now.'),
    ).toBeTruthy();
    expect(screen.queryByTestId('item-primary-action')).toBeNull();
  });

  test('offers a message to the owner on an open giveaway', async () => {
    renderScreen({ item: { is_giveaway: true } });

    expect(await screen.findByTestId('item-composer')).toBeTruthy();
    expect(screen.getByText('Message Ada')).toBeTruthy();
    expect(screen.getByText(GIVEAWAY_HINT)).toBeTruthy();
    expect(screen.getByLabelText('Message').props.placeholder).toBe(
      "Hi! I'm interested in this item. When could I pick it up?",
    );
    expect(screen.queryByTestId('item-primary-action')).toBeNull();
    expect(screen.queryByText(/coming to the app soon/)).toBeNull();
  });

  test('reflects interest the viewer has already expressed', async () => {
    renderScreen({
      item: { is_giveaway: true, viewer_interest_status: 'active' },
    });

    expect(
      await screen.findByText(
        "You've expressed interest. The owner picks who receives it.",
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('item-composer')).toBeTruthy();
    expect(screen.queryByTestId('item-primary-action')).toBeNull();
  });

  test('offers the owner edit and delete instead of a web-only note', async () => {
    renderScreen({
      viewer: { is_owner: true, shares_circle_with_owner: false },
    });

    expect(await screen.findByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(screen.queryByText(/Manage it on meutch.com/)).toBeNull();
    expect(screen.queryByTestId('item-primary-action')).toBeNull();
  });

  test('offers non-owners neither edit nor delete', async () => {
    renderScreen();

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  test('shows the interest count on the owner of a giveaway', async () => {
    renderScreen({
      viewer: { is_owner: true, shares_circle_with_owner: false },
      item: { is_giveaway: true, interested_count: 3 },
    });

    expect(
      await screen.findByText('3 members have expressed interest.'),
    ).toBeTruthy();
  });

  test('tells the owner when nobody has expressed interest', async () => {
    renderScreen({
      viewer: { is_owner: true, shares_circle_with_owner: false },
      item: { is_giveaway: true, interested_count: 0 },
    });

    expect(
      await screen.findByText('No one has expressed interest yet.'),
    ).toBeTruthy();
  });

  test('omits the interest count when the API does not return one', async () => {
    renderScreen({
      viewer: { is_owner: true, shares_circle_with_owner: false },
      item: { is_giveaway: true, interested_count: null },
    });

    expect(await screen.findByTestId('item-edit')).toBeTruthy();
    expect(screen.queryByText(/expressed interest/)).toBeNull();
  });

  test('offers interest on a public giveaway without a shared circle', async () => {
    renderScreen({
      viewer: { shares_circle_with_owner: false },
      item: { is_giveaway: true, giveaway_visibility: 'public' },
    });

    expect(await screen.findByTestId('item-composer')).toBeTruthy();
    expect(screen.queryByText(/share a circle/)).toBeNull();
  });

  test('explains that borrowing needs a shared circle', async () => {
    renderScreen({
      viewer: { shares_circle_with_owner: false },
      item: { is_giveaway: false },
    });

    expect(
      await screen.findByText("You don't share a circle with this owner."),
    ).toBeTruthy();
    expect(screen.queryByTestId('item-primary-action')).toBeNull();
  });

  test('offers no request action to the active borrower', async () => {
    renderScreen({
      viewer: { is_active_borrower: true },
      item: { available: false },
    });

    expect(
      await screen.findByText('Returns are on meutch.com for now.'),
    ).toBeTruthy();
    expect(screen.getByTestId('item-composer')).toBeTruthy();
    expect(screen.queryByTestId('item-primary-action')).toBeNull();
  });
});

describe('<ItemDetailScreen /> owner actions', () => {
  const ownerOptions = {
    viewer: { is_owner: true, shares_circle_with_owner: false },
  };

  function respondToDelete(authenticatedApiFetch: jest.Mock) {
    const item = buildItem();

    authenticatedApiFetch.mockImplementation(
      async (_path: string, init?: RequestInit) =>
        init?.method === 'DELETE'
          ? jsonResponse({ deleted: true, item_id: ITEM_ID })
          : jsonResponse({ item, viewer: buildViewer(ownerOptions.viewer) }),
    );
  }

  test('Edit opens the edit route', async () => {
    renderScreen(ownerOptions);

    fireEvent.press(await screen.findByTestId('item-edit'));

    expect(mockPush).toHaveBeenCalledWith(`/item/${ITEM_ID}/edit`);
  });

  test('Delete asks for confirmation before sending anything', async () => {
    const { authenticatedApiFetch } = renderScreen(ownerOptions);

    fireEvent.press(await screen.findByTestId('item-delete'));

    expect(screen.getByText('Delete this item?')).toBeTruthy();
    expect(screen.getByText("This can't be undone.")).toBeTruthy();
    expectOnlyReads(authenticatedApiFetch);
  });

  test('confirming deletes the item and goes back', async () => {
    const { authenticatedApiFetch } = renderScreen(ownerOptions);

    respondToDelete(authenticatedApiFetch);
    fireEvent.press(await screen.findByTestId('item-delete'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    const call = authenticatedApiFetch.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'DELETE',
    ) as [string, RequestInit];

    expect(call[0]).toBe(`/items/${ITEM_ID}`);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('falls back to the tabs when there is nothing to go back to', async () => {
    mockCanGoBack.mockReturnValue(false);
    const { authenticatedApiFetch } = renderScreen(ownerOptions);

    respondToDelete(authenticatedApiFetch);
    fireEvent.press(await screen.findByTestId('item-delete'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('a conflict keeps the dialog open and shows the server message', async () => {
    const { authenticatedApiFetch } = renderScreen(ownerOptions);
    const item = buildItem();

    authenticatedApiFetch.mockImplementation(
      async (_path: string, init?: RequestInit) =>
        init?.method === 'DELETE'
          ? jsonResponse(
              {
                error: {
                  code: 'CONFLICT',
                  message: 'This item has an active loan.',
                },
              },
              409,
            )
          : jsonResponse({ item, viewer: buildViewer(ownerOptions.viewer) }),
    );

    fireEvent.press(await screen.findByTestId('item-delete'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    expect(await screen.findByTestId('confirm-dialog-error')).toHaveTextContent(
      'This item has an active loan.',
    );
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('cancelling closes the dialog without deleting', async () => {
    const { authenticatedApiFetch } = renderScreen(ownerOptions);

    fireEvent.press(await screen.findByTestId('item-delete'));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });
    expectOnlyReads(authenticatedApiFetch);
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('<ItemDetailScreen /> messaging the owner', () => {
  function respondToSend(
    authenticatedApiFetch: jest.Mock,
    sendResponse: Response,
  ) {
    const item = buildItem();

    authenticatedApiFetch.mockImplementation(
      async (path: string, init?: RequestInit) =>
        path === '/messages' && init?.method === 'POST'
          ? sendResponse
          : jsonResponse({ item, viewer: buildViewer() }),
    );
  }

  test('sends a message to the owner and opens the thread', async () => {
    const { authenticatedApiFetch, queryClient } = renderScreen();

    respondToSend(
      authenticatedApiFetch,
      jsonResponse(
        {
          message: {
            id: MESSAGE_ID,
            body: 'Is it free this weekend?',
            timestamp: '2026-05-27T10:00:00+00:00',
            is_read: false,
            sender: { ...borrower, id: viewingUser.id },
            recipient: owner,
          },
        },
        201,
      ),
    );

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    fireEvent.changeText(
      await screen.findByLabelText('Message'),
      'Is it free this weekend?',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/message/${MESSAGE_ID}`);
    });

    const [, init] = authenticatedApiFetch.mock.calls.find(
      ([calledPath]) => calledPath === '/messages',
    ) as [string, RequestInit];

    expect(getRequestBody(init)).toEqual({
      item_id: ITEM_ID,
      body: 'Is it free this weekend?',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: itemKeys.detail(ITEM_ID),
    });
    await waitFor(() => {
      expect(
        authenticatedApiFetch.mock.calls.filter(
          ([calledPath]) => calledPath === `/items/${ITEM_ID}`,
        ),
      ).toHaveLength(2);
    });
  });

  test('shows why a message failed to send', async () => {
    const { authenticatedApiFetch } = renderScreen();

    respondToSend(
      authenticatedApiFetch,
      jsonResponse(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You must share a circle with the owner.',
          },
        },
        403,
      ),
    );

    fireEvent.changeText(await screen.findByLabelText('Message'), 'Hello');
    fireEvent.press(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByTestId('item-send-error')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('uses the loan placeholder and no hint on a loan item', async () => {
    renderScreen();

    expect(await screen.findByTestId('item-composer')).toBeTruthy();
    expect(screen.getByLabelText('Message').props.placeholder).toBe(
      'What do you want to know about the item or lending it?',
    );
    expect(screen.queryByText(GIVEAWAY_HINT)).toBeNull();
  });

  test('offers the owner no composer', async () => {
    renderScreen({
      viewer: { is_owner: true, shares_circle_with_owner: false },
      item: { is_giveaway: true, interested_count: 0 },
    });

    expect(await screen.findByTestId('item-edit')).toBeTruthy();
    expect(screen.queryByTestId('item-composer')).toBeNull();
  });

  test('offers no composer when the owner account is deleted', async () => {
    renderScreen({ item: { owner: null, is_giveaway: true } });

    expect(await screen.findByText('Deleted User')).toBeTruthy();
    expect(screen.queryByTestId('item-composer')).toBeNull();
    expect(screen.queryByLabelText('Message')).toBeNull();
  });
});

describe('<ItemDetailScreen /> errors', () => {
  test('explains a 403 without offering a retry', async () => {
    const authenticatedApiFetch = mockFetch();

    authenticatedApiFetch.mockResolvedValue(
      jsonResponse(
        { error: { code: 'FORBIDDEN', message: 'Not allowed.' } },
        403,
      ),
    );
    setParams(ITEM_ID);
    renderWithProviders(<ItemDetailScreen />);

    expect(await screen.findByText("You can't see this item")).toBeTruthy();
    expect(
      screen.getByText("It's shared with circles you're not part of."),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
    expect(lastTitle()).toBe('Item');
  });

  test('explains a 404 differently, also without a retry', async () => {
    const authenticatedApiFetch = mockFetch();

    authenticatedApiFetch.mockResolvedValue(
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'Gone.' } }, 404),
    );
    setParams(ITEM_ID);
    renderWithProviders(<ItemDetailScreen />);

    expect(await screen.findByText('This item is gone')).toBeTruthy();
    expect(
      screen.getByText('It may have been given away or removed.'),
    ).toBeTruthy();
    expect(screen.queryByText("You can't see this item")).toBeNull();
    expect(screen.queryByLabelText('Try again')).toBeNull();
  });

  test('offers a retry when the device is offline', async () => {
    const authenticatedApiFetch = mockFetch();
    const item = buildItem();

    authenticatedApiFetch
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(jsonResponse({ item, viewer: buildViewer() }));
    setParams(ITEM_ID);
    renderWithProviders(<ItemDetailScreen />);

    expect(await screen.findByText('You appear to be offline')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
    expectOnlyReads(authenticatedApiFetch);
  });

  test('offers a retry when rate limited', async () => {
    const authenticatedApiFetch = mockFetch();
    const item = buildItem();

    authenticatedApiFetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests.',
            },
          },
          429,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ item, viewer: buildViewer() }));
    setParams(ITEM_ID);
    renderWithProviders(<ItemDetailScreen />);

    expect(await screen.findByText('Slow down')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
  });
});

describe('<ItemDetailScreen /> route params', () => {
  test('shows the missing-item state for an id that is not a uuid', async () => {
    const authenticatedApiFetch = mockFetch();

    setParams('not-a-uuid');
    renderWithProviders(<ItemDetailScreen />);

    expect(await screen.findByText('This item is gone')).toBeTruthy();
    expect(authenticatedApiFetch).not.toHaveBeenCalled();
    expect(lastTitle()).toBe('Item');
  });

  test('shows the missing-item state when the id is absent', async () => {
    const authenticatedApiFetch = mockFetch();

    setParams(undefined);
    renderWithProviders(<ItemDetailScreen />);

    expect(await screen.findByText('This item is gone')).toBeTruthy();
    expect(authenticatedApiFetch).not.toHaveBeenCalled();
  });

  test('uses the first value when the id arrives repeated', async () => {
    const { authenticatedApiFetch } = renderScreen({
      id: [ITEM_ID, 'second'],
    });

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe(`/items/${ITEM_ID}`);
  });
});

describe('<ItemDetailScreen /> description links', () => {
  test('opens a url in the text in the browser', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    renderScreen({ item: { description: 'Manual: https://example.org/path' } });

    fireEvent.press(
      await screen.findByRole('link', { name: 'https://example.org/path' }),
    );

    expect(openURL).toHaveBeenCalledWith('https://example.org/path');
  });
});
