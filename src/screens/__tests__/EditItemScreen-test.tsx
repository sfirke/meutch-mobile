import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import type { ApiFetch } from '../../lib/api';
import type { ItemDetail } from '../../lib/items';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  defaultProfileFixture,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
  type MockRoute,
} from '../../test-utils/renderWithProviders';
import { EditItemScreen } from '../EditItemScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockNavigation = {
  addListener: jest.fn(() => () => undefined),
  dispatch: jest.fn(),
};

jest.mock('expo-router', () => ({
  Stack: { Screen: jest.fn(() => null) },
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  useLocalSearchParams: jest.fn(),
  useFocusEffect: jest.fn(),
  useNavigation: () => mockNavigation,
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const ITEM_ID = 'b2222222-2222-4222-8222-222222222222';
const CATEGORY = { id: 'c3333333-3333-4333-8333-333333333333', name: 'Tools' };

const item: ItemDetail = {
  id: ITEM_ID,
  name: 'Cordless drill',
  description: 'Charger included.',
  available: true,
  is_giveaway: false,
  giveaway_visibility: null,
  claim_status: null,
  created_at: '2026-05-26T18:30:00+00:00',
  image_url: null,
  owner: {
    id: 'a1111111-1111-4111-8111-111111111111',
    first_name: 'Ada',
    last_name: 'Example',
    full_name: 'Ada Example',
    profile_image_url: null,
    profile_viewable: false,
  },
  category: CATEGORY,
  tags: [{ id: 'd4444444-4444-4444-8444-444444444444', name: 'power' }],
  images: [],
  claimed_by: null,
  current_loan: null,
  viewer_interest_status: null,
  interested_count: null,
};

function detailResponse(isOwner = true) {
  return {
    item,
    viewer: {
      is_owner: isOwner,
      shares_circle_with_owner: true,
      is_active_borrower: false,
    },
  };
}

function renderScreen(
  routes?: Record<string, MockRoute>,
  id: string = ITEM_ID,
  apiFetch: ApiFetch = mockApiFetch({
    '/categories': { categories: [CATEGORY] },
    '/tags': { tags: [] },
    '/me/profile': { user: defaultProfileFixture },
    [`/items/${ITEM_ID}`]: detailResponse(),
    ...routes,
  }),
) {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id });
  mockSession({ authenticatedApiFetch: apiFetch });
  renderWithProviders(<EditItemScreen />);

  return apiFetch;
}

async function settle() {
  await screen.findByRole('button', { name: /^Category: (?!Loading)/ });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('edit item screen', () => {
  test('shows a loading indicator while the item loads', async () => {
    renderScreen(
      undefined,
      ITEM_ID,
      jest.fn(() => new Promise<Response>(() => undefined)),
    );

    expect(await screen.findByLabelText('Loading item')).toBeTruthy();
  });

  test('shows an error state for an invalid id', () => {
    renderScreen(undefined, 'not-an-id');

    expect(screen.getByText('This item is gone')).toBeTruthy();
    expect(screen.queryByTestId('item-name')).toBeNull();
  });

  test("refuses to edit someone else's item", async () => {
    renderScreen({ [`/items/${ITEM_ID}`]: detailResponse(false) });

    expect(
      await screen.findByText('You can only edit your own items.'),
    ).toBeTruthy();
    expect(screen.queryByTestId('item-name')).toBeNull();
  });

  test('prefills the form from the item', async () => {
    renderScreen();
    await settle();

    expect(screen.getByTestId('item-name').props.value).toBe('Cordless drill');
    expect(
      screen.getByRole('button', { name: 'Category: Tools' }),
    ).toBeTruthy();
    expect(screen.getByText('power')).toBeTruthy();
  });

  test('saves the changes and goes back', async () => {
    const apiFetch = renderScreen({
      [`PATCH /items/${ITEM_ID}`]: detailResponse(),
    }) as jest.Mock;
    await settle();

    fireEvent.changeText(screen.getByTestId('item-name'), 'Hammer drill');
    fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    const patch = apiFetch.mock.calls.find(
      ([, init]: [string, RequestInit?]) => init?.method === 'PATCH',
    ) as [string, RequestInit];
    expect(patch[0]).toBe(`/items/${ITEM_ID}`);
    expect(getRequestBody(patch[1])).toEqual({
      name: 'Hammer drill',
      description: 'Charger included.',
      category_id: CATEGORY.id,
      tags: ['power'],
      is_giveaway: false,
      giveaway_visibility: null,
    });
  });

  test('shows the backend message for a conflict', async () => {
    renderScreen({
      [`PATCH /items/${ITEM_ID}`]: jsonResponse(
        {
          error: {
            code: 'CONFLICT',
            message: 'This item is on loan right now.',
          },
        },
        409,
      ),
    });
    await settle();

    fireEvent.changeText(screen.getByTestId('item-name'), 'Hammer drill');
    fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByTestId('item-form-error')).toHaveTextContent(
      'This item is on loan right now.',
    );
    expect(mockBack).not.toHaveBeenCalled();
  });
});
