import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import type {
  ItemDetail,
  ItemImage,
  ItemViewerState,
  UserSummary,
} from '../../lib/items';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { ItemDetailScreen } from '../ItemDetailScreen';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

jest.mock('expo-router', () => ({
  Stack: { Screen: jest.fn(() => null) },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const ITEM_ID = 'b2222222-2222-4222-8222-222222222222';

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
  renderWithProviders(<ItemDetailScreen />);

  return { authenticatedApiFetch, item, viewer };
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

  test('offers a disabled interest action on an open giveaway', async () => {
    renderScreen({ item: { is_giveaway: true } });

    const action = await screen.findByTestId('item-primary-action');

    expect(screen.getByText('Express Interest')).toBeTruthy();
    expect(action).toBeDisabled();
    expect(
      screen.getByText(
        'Expressing interest is coming to the app soon. For now, use meutch.com.',
      ),
    ).toBeTruthy();
  });

  test('reflects interest the viewer has already expressed', async () => {
    renderScreen({
      item: { is_giveaway: true, viewer_interest_status: 'active' },
    });

    const action = await screen.findByTestId('item-primary-action');

    expect(screen.getByText("You've expressed interest")).toBeTruthy();
    expect(action).toBeDisabled();
  });

  test('tells the owner where their item is managed', async () => {
    renderScreen({
      viewer: { is_owner: true, shares_circle_with_owner: false },
    });

    expect(
      await screen.findByText('This is your item. Manage it on meutch.com.'),
    ).toBeTruthy();
    expect(screen.queryByTestId('item-primary-action')).toBeNull();
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

    expect(
      await screen.findByText('This is your item. Manage it on meutch.com.'),
    ).toBeTruthy();
    expect(screen.queryByText(/expressed interest/)).toBeNull();
  });

  test('offers interest on a public giveaway without a shared circle', async () => {
    renderScreen({
      viewer: { shares_circle_with_owner: false },
      item: { is_giveaway: true, giveaway_visibility: 'public' },
    });

    expect(await screen.findByTestId('item-primary-action')).toBeTruthy();
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
      await screen.findByText(
        'Returns and messages are on meutch.com for now.',
      ),
    ).toBeTruthy();
    expect(screen.queryByTestId('item-primary-action')).toBeNull();
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
