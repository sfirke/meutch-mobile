import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import { createCreationToken } from '../../lib/creationToken';
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
import { NewItemScreen } from '../NewItemScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

jest.mock('../../lib/creationToken', () => {
  const actual = jest.requireActual('../../lib/creationToken');

  return { createCreationToken: jest.fn(actual.createCreationToken) };
});

type LeaveEvent = {
  preventDefault: jest.Mock;
  data: { action: { type: string } };
};

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockListeners: Record<string, (event: LeaveEvent) => void> = {};
const mockNavigation = {
  addListener: jest.fn(
    (name: string, listener: (event: LeaveEvent) => void) => {
      mockListeners[name] = listener;
      return () => undefined;
    },
  ),
  dispatch: jest.fn(),
};

jest.mock('expo-router', () => ({
  Stack: { Screen: jest.fn(() => null) },
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: jest.fn(),
  useNavigation: () => mockNavigation,
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const NEW_ID = 'b2222222-2222-4222-8222-222222222222';
const CATEGORY = { id: 'c3333333-3333-4333-8333-333333333333', name: 'Tools' };

const created: ItemDetail = {
  id: NEW_ID,
  name: 'Drill',
  description: null,
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
  tags: [],
  images: [],
  claimed_by: null,
  current_loan: null,
  viewer_interest_status: null,
  interested_count: null,
};

const CREATED_RESPONSE = {
  item: created,
  viewer: {
    is_owner: true,
    shares_circle_with_owner: true,
    is_active_borrower: false,
  },
};

function renderScreen(routes?: Record<string, MockRoute>) {
  const apiFetch = mockApiFetch({
    '/categories': { categories: [CATEGORY] },
    '/tags': { tags: [] },
    '/me/profile': { user: defaultProfileFixture },
    ...routes,
  });
  mockSession({ authenticatedApiFetch: apiFetch });
  renderWithProviders(<NewItemScreen />);

  return apiFetch;
}

async function settle() {
  await screen.findByRole('button', { name: /^Category: (?!Loading)/ });
}

async function fillForm() {
  await settle();
  fireEvent.changeText(screen.getByTestId('item-name'), 'Drill');
  fireEvent.press(
    screen.getByRole('button', { name: 'Category: Choose a category' }),
  );
  fireEvent.press(
    within(screen.getByTestId('option-sheet')).getByTestId(
      `option-${CATEGORY.id}`,
    ),
  );
}

function leave() {
  const event: LeaveEvent = {
    preventDefault: jest.fn(),
    data: { action: { type: 'GO_BACK' } },
  };

  act(() => mockListeners.beforeRemove(event));

  return event;
}

function postBodies(apiFetch: ReturnType<typeof mockApiFetch>) {
  return apiFetch.mock.calls
    .filter(([path, init]) => path === '/items' && init?.method === 'POST')
    .map(([, init]) => getRequestBody(init));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('new item screen', () => {
  test('creates the item with its token and opens it', async () => {
    const apiFetch = renderScreen({ 'POST /items': CREATED_RESPONSE });

    await fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'List item' }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(`/item/${NEW_ID}`),
    );
    expect(postBodies(apiFetch)).toEqual([
      {
        name: 'Drill',
        description: null,
        category_id: CATEGORY.id,
        tags: [],
        is_giveaway: false,
        giveaway_visibility: null,
        creation_token: jest.mocked(createCreationToken).mock.results[0].value,
      },
    ]);
  });

  test('reuses the creation token when retrying a failed create', async () => {
    let attempts = 0;
    const apiFetch = renderScreen({
      'POST /items': () => {
        attempts += 1;
        return attempts === 1
          ? jsonResponse(
              { error: { code: 'INTERNAL_ERROR', message: 'Server error.' } },
              500,
            )
          : CREATED_RESPONSE;
      },
    });

    await fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'List item' }));
    expect(await screen.findByTestId('item-form-error')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'List item' }));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(`/item/${NEW_ID}`),
    );
    const bodies = postBodies(apiFetch) as { creation_token: string }[];
    expect(bodies).toHaveLength(2);
    expect(bodies[0].creation_token).toBe(bodies[1].creation_token);
    expect(createCreationToken).toHaveBeenCalledTimes(1);
  });

  test('shows a 422 beside the name field', async () => {
    renderScreen({
      'POST /items': jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input.',
            details: { name: ['Too long.'] },
          },
        },
        422,
      ),
    });

    await fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'List item' }));

    expect(await screen.findByTestId('field-error-name')).toHaveTextContent(
      'Too long.',
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('leaves a clean form without asking', async () => {
    renderScreen();
    await settle();

    expect(leave().preventDefault).not.toHaveBeenCalled();
    expect(screen.queryByText('Discard this item?')).toBeNull();
  });

  test('asks before discarding a dirty form', async () => {
    renderScreen();
    await settle();
    fireEvent.changeText(screen.getByTestId('item-name'), 'Drill');

    const event = leave();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(screen.getByText('Discard this item?')).toBeTruthy();
    expect(screen.getByText("Your changes won't be saved.")).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();
    expect(screen.queryByText('Discard this item?')).toBeNull();

    leave();
    fireEvent.press(screen.getByRole('button', { name: 'Discard' }));
    expect(mockNavigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
  });

  test('does not ask after a successful save', async () => {
    renderScreen({ 'POST /items': CREATED_RESPONSE });

    await fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'List item' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());

    expect(leave().preventDefault).not.toHaveBeenCalled();
    expect(screen.queryByText('Discard this item?')).toBeNull();
  });
});
