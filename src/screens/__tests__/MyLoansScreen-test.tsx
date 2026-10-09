import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import type { ApiFetch } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  jsonResponse,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { MyLoansScreen } from '../MyLoansScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useFocusEffect: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const push = jest.fn();

const BORROWING_PAGE_1 = '/me/loans?role=borrowing&status=all&page=1';
const BORROWING_PAGE_2 = '/me/loans?role=borrowing&status=all&page=2';
const LENDING_PAGE_1 = '/me/loans?role=lending&status=all&page=1';

const LOAN_ID = 'a1111111-1111-4111-8111-111111111111';
const SECOND_LOAN_ID = 'b2222222-2222-4222-8222-222222222222';
const THIRD_LOAN_ID = 'c3333333-3333-4333-8333-333333333333';

const viewer = {
  id: 'fake-user-1',
  first_name: 'Morgan',
  last_name: 'Member',
  full_name: 'Morgan Member',
  profile_image_url: null,
  profile_viewable: true,
};

const owner = {
  id: 'd4444444-4444-4444-8444-444444444444',
  first_name: 'Ada',
  last_name: 'Example',
  full_name: 'Ada Example',
  profile_image_url: null,
  profile_viewable: true,
};

function loan(overrides?: Record<string, unknown>) {
  return {
    id: LOAN_ID,
    status: 'approved',
    start_date: '2026-05-01',
    end_date: '2026-05-08',
    item: {
      id: 'e5555555-5555-4555-8555-555555555555',
      name: 'Cordless drill',
      available: false,
      image_url: null,
    },
    owner,
    borrower: viewer,
    latest_conversation_message_id: null,
    due_state: 'on_time',
    days_until_due: 3,
    days_overdue: null,
    ...overrides,
  };
}

function itemNamed(name: string) {
  return {
    id: 'f6666666-6666-4666-8666-666666666666',
    name,
    available: true,
    image_url: null,
  };
}

const pendingLoan = loan({
  id: SECOND_LOAN_ID,
  status: 'pending',
  item: itemNamed('Folding ladder'),
  due_state: null,
  days_until_due: null,
});

function loanPage(
  loans: Record<string, unknown>[],
  paginationOverrides?: Record<string, unknown>,
) {
  return jsonResponse({
    loans,
    pagination: {
      page: 1,
      per_page: 20,
      total: loans.length,
      pages: 1,
      has_next: false,
      has_prev: false,
      ...paginationOverrides,
    },
  });
}

function renderMyLoansScreen(
  authenticatedApiFetch: jest.MockedFunction<ApiFetch>,
) {
  mockSession({
    authenticatedApiFetch,
    user: {
      ...viewer,
      email: 'fake.member@example.com',
      email_confirmed: true,
    },
  });

  return renderWithProviders(<MyLoansScreen />);
}

function renderedTexts(): string[] {
  return screen
    .UNSAFE_getAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push,
  } as unknown as ReturnType<typeof useRouter>);
});

describe('MyLoansScreen', () => {
  test('shows a spinner, then rows, and requests borrowing page 1', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const authenticatedApiFetch = jest.fn(
      (_path: string) =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as jest.MockedFunction<ApiFetch>;

    renderMyLoansScreen(authenticatedApiFetch);

    expect(await screen.findByLabelText('Loading loans')).toBeTruthy();

    resolveFetch(loanPage([loan()]));

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(screen.getByText('From Ada Example')).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls[0][0]).toBe(BORROWING_PAGE_1);
  });

  test('switching to Lending requests the lending role', async () => {
    const authenticatedApiFetch = jest.fn(async (path: string) =>
      path === LENDING_PAGE_1
        ? loanPage([
            loan({
              id: THIRD_LOAN_ID,
              item: itemNamed('Tile saw'),
              owner: viewer,
              borrower: owner,
            }),
          ])
        : loanPage([loan()]),
    ) as jest.MockedFunction<ApiFetch>;

    renderMyLoansScreen(authenticatedApiFetch);

    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    fireEvent.press(screen.getByText('Lending'));

    expect(screen.queryByText('Cordless drill')).toBeNull();
    expect(screen.queryByText('To Morgan Member')).toBeNull();

    expect(await screen.findByText('Tile saw')).toBeTruthy();
    expect(screen.queryByText('To Morgan Member')).toBeNull();
    expect(screen.getByText('To Ada Example')).toBeTruthy();
    expect(authenticatedApiFetch.mock.calls[1][0]).toBe(LENDING_PAGE_1);
  });

  test('groups pending requests above active loans', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      loanPage([pendingLoan, loan()]),
    ) as jest.MockedFunction<ApiFetch>;

    renderMyLoansScreen(authenticatedApiFetch);

    expect(await screen.findByText('Folding ladder')).toBeTruthy();

    const texts = renderedTexts();
    const order = [
      'Requests',
      'Folding ladder',
      'On loan',
      'Cordless drill',
    ].map((text) => texts.indexOf(text));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test('omits the Requests header when every loan is approved', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      loanPage([loan()]),
    ) as jest.MockedFunction<ApiFetch>;

    renderMyLoansScreen(authenticatedApiFetch);

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(screen.getByText('On loan')).toBeTruthy();
    expect(screen.queryByText('Requests')).toBeNull();
  });

  test('shows the empty copy for each role', async () => {
    let resolveLending: (value: Response) => void = () => {};
    const authenticatedApiFetch = jest.fn((path: string) =>
      path === LENDING_PAGE_1
        ? new Promise<Response>((resolve) => {
            resolveLending = resolve;
          })
        : Promise.resolve(loanPage([])),
    ) as jest.MockedFunction<ApiFetch>;

    const { queryClient } = renderMyLoansScreen(authenticatedApiFetch);

    expect(await screen.findByText('Nothing borrowed right now')).toBeTruthy();
    expect(
      screen.getByText(
        "Items you've asked to borrow, and loans you have out, show up here.",
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByText('Lending'));

    expect(await screen.findByLabelText('Loading loans')).toBeTruthy();
    expect(screen.queryByText('Nothing borrowed right now')).toBeNull();
    expect(screen.queryByText('Nothing lent out right now')).toBeNull();

    resolveLending(loanPage([]));

    expect(await screen.findByText('Nothing lent out right now')).toBeTruthy();
    expect(
      screen.getByText(
        "Requests for your items, and items you've lent, show up here.",
      ),
    ).toBeTruthy();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  test('shows offline copy and retries on request', async () => {
    const authenticatedApiFetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(
        loanPage([loan()]),
      ) as jest.MockedFunction<ApiFetch>;

    renderMyLoansScreen(authenticatedApiFetch);

    expect(await screen.findByText('You appear to be offline')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText('Cordless drill')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
  });

  test('loads page 2 when the list reaches its end', async () => {
    const authenticatedApiFetch = jest.fn(async (path: string) => {
      if (path === BORROWING_PAGE_1) {
        return loanPage([loan()], { page: 1, has_next: true });
      }

      if (path === BORROWING_PAGE_2) {
        return loanPage(
          [loan({ id: THIRD_LOAN_ID, item: itemNamed('Tile saw') })],
          { page: 2, has_next: false },
        );
      }

      throw new Error(`Unexpected request: ${path}`);
    }) as jest.MockedFunction<ApiFetch>;

    renderMyLoansScreen(authenticatedApiFetch);

    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    fireEvent(screen.getByTestId('my-loans-list'), 'endReached');

    expect(await screen.findByText('Tile saw')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
    expect(authenticatedApiFetch.mock.calls[1][0]).toBe(BORROWING_PAGE_2);
  });

  test('tapping a row opens the loan', async () => {
    const authenticatedApiFetch = jest.fn(async (_path: string) =>
      loanPage([loan()]),
    ) as jest.MockedFunction<ApiFetch>;

    renderMyLoansScreen(authenticatedApiFetch);

    fireEvent.press(
      await screen.findByRole('button', {
        name: /^Cordless drill, From Ada Example, /,
      }),
    );

    expect(push).toHaveBeenCalledWith(`/loan/${LOAN_ID}`);
  });

  test('pull-to-refresh re-requests only the first page', async () => {
    const authenticatedApiFetch = jest.fn(async (path: string) => {
      if (path === BORROWING_PAGE_1) {
        return loanPage([loan()], { page: 1, has_next: true });
      }

      if (path === BORROWING_PAGE_2) {
        return loanPage(
          [loan({ id: THIRD_LOAN_ID, item: itemNamed('Tile saw') })],
          { page: 2, has_next: false },
        );
      }

      throw new Error(`Unexpected request: ${path}`);
    }) as jest.MockedFunction<ApiFetch>;

    const { queryClient } = renderMyLoansScreen(authenticatedApiFetch);

    expect(await screen.findByText('Cordless drill')).toBeTruthy();

    const list = screen.getByTestId('my-loans-list');
    fireEvent(list, 'endReached');

    expect(await screen.findByText('Tile saw')).toBeTruthy();

    fireEvent(list, 'refresh');

    await waitFor(
      () => expect(authenticatedApiFetch).toHaveBeenCalledTimes(3),
      { timeout: 3000 },
    );
    expect(authenticatedApiFetch.mock.calls[2][0]).toBe(BORROWING_PAGE_1);
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });
});
