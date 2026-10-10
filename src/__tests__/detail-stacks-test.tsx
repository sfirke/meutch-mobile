import type { PropsWithChildren } from 'react';
import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { useSession } from '../session/SessionProvider';
import MockFontAwesome6 from '../test-utils/mockFontAwesome6';
import { emptyApiFetch } from '../test-utils/renderWithProviders';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../session/SessionProvider', () => ({
  SessionProvider: ({ children }: PropsWithChildren) => children,
  useSession: jest.fn(),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

type SessionValue = ReturnType<typeof useSession>;

const mockedUseSession = jest.mocked(useSession);

const member: SessionValue['user'] = {
  email: 'member@example.com',
  email_confirmed: true,
  first_name: 'Morgan',
  full_name: 'Morgan Member',
  id: '0f2f0d1a-6e8b-4f0f-9c2f-1b9d2a3c4d5e',
  last_name: 'Member',
  profile_image_url: null,
};

const THREAD_ID = '0f2f0d1a-6e8b-4f0f-9c2f-1b9d2a3c4d5e';
const CIRCLE_ID = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
const REQUEST_ID = '2b3c4d5e-6f7a-4b2c-9d3e-4f5a6b7c8d9e';
const USER_ID = '3c4d5e6f-7a8b-4c3d-9e4f-5a6b7c8d9e0f';
const LOAN_ID = '4d5e6f7a-8b9c-4d4e-8f5a-6b7c8d9e0f1a';
const ITEM_ID = '5e6f7a8b-9c0d-4e5f-8a6b-7c8d9e0f1a2b';

function mockSession(overrides: Partial<SessionValue>) {
  mockedUseSession.mockReturnValue({
    authenticatedApiFetch: emptyApiFetch(),
    discardSession: jest.fn(),
    errorCode: null,
    errorMessage: null,
    notice: null,
    refreshUser: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    status: 'signed-out',
    user: null,
    ...overrides,
  });
}

describe('detail stacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('mounts the thread screen for a message deep link', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', {
      initialUrl: `/message/${THREAD_ID}`,
    });

    // The shared empty fetch answers every path with a collection page, which
    // is not a thread payload, so the screen never leaves its loading state.
    expect(await screen.findByLabelText('Loading conversation')).toBeTruthy();
    expect(getPathname()).toBe(`/message/${THREAD_ID}`);
  });

  test('mounts the circle detail screen for a circle deep link', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', {
      initialUrl: `/circle/${CIRCLE_ID}`,
    });

    // The shared empty fetch answers every path with a collection page, which
    // is not a circle detail payload, so the screen never leaves its loading
    // state.
    expect(await screen.findByLabelText('Loading circle')).toBeTruthy();
    expect(getPathname()).toBe(`/circle/${CIRCLE_ID}`);
  });

  test('mounts the request detail screen for a request deep link', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', {
      initialUrl: `/request/${REQUEST_ID}`,
    });

    // As above: the empty fetch never returns a request detail payload.
    expect(await screen.findByLabelText('Loading request')).toBeTruthy();
    expect(getPathname()).toBe(`/request/${REQUEST_ID}`);
  });

  test('mounts the user profile screen for a user deep link', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', {
      initialUrl: `/user/${USER_ID}`,
    });

    // As above: the empty fetch never returns a user profile payload.
    expect(await screen.findByLabelText('Loading profile')).toBeTruthy();
    expect(getPathname()).toBe(`/user/${USER_ID}`);
  });

  test('mounts the loan detail screen for a loan deep link', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', {
      initialUrl: `/loan/${LOAN_ID}`,
    });

    // As above: the empty fetch never returns a loan detail payload.
    expect(await screen.findByLabelText('Loading loan')).toBeTruthy();
    expect(getPathname()).toBe(`/loan/${LOAN_ID}`);
  });

  test.each([
    ['/profile/items', 'Nothing listed to lend'],
    ['/profile/loans', 'Nothing borrowed right now'],
    ['/profile/requests', 'No active requests'],
  ])('mounts the own-activity list at %s', async (path, emptyTitle) => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', { initialUrl: path });

    // The empty fetch answers each list with an empty page, so the screen
    // settles on its empty state.
    expect(await screen.findByText(emptyTitle)).toBeTruthy();
    expect(getPathname()).toBe(path);
  });

  test('mounts the new item form at /item/new', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', { initialUrl: '/item/new' });

    expect(
      await screen.findByRole('button', { name: 'List item' }),
    ).toBeTruthy();
    expect(getPathname()).toBe('/item/new');
  });

  test('mounts the edit screen for an item edit link', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', {
      initialUrl: `/item/${ITEM_ID}/edit`,
    });

    // As above: the empty fetch never returns an item detail payload.
    expect(await screen.findByLabelText('Loading item')).toBeTruthy();
    expect(getPathname()).toBe(`/item/${ITEM_ID}/edit`);
  });

  test('mounts the settings screen at /profile/settings', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', {
      initialUrl: '/profile/settings',
    });

    expect(await screen.findByRole('button', { name: 'Save' })).toBeTruthy();
    expect(getPathname()).toBe('/profile/settings');
  });

  test.each([
    ['edit profile', '/profile/edit', 'First name'],
    ['location', '/profile/location', 'Save location'],
    ['delete account', '/profile/delete-account', 'Delete my account'],
  ])('mounts the %s screen at %s', async (_name, path, expected) => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', { initialUrl: path });

    expect(await screen.findByText(expected)).toBeTruthy();
    expect(getPathname()).toBe(path);
  });

  test('renders the profile tab at /profile, not the settings stack', async () => {
    mockSession({ status: 'signed-in', user: member });

    const { getPathname } = renderRouter('app', { initialUrl: '/profile' });

    expect(
      await screen.findByRole('button', { name: 'Sign out' }),
    ).toBeTruthy();
    expect(getPathname()).toBe('/profile');
  });

  test('redirects a signed-out visitor from a message deep link to sign-in', async () => {
    mockSession({ status: 'signed-out' });

    const { getPathname } = renderRouter('app', {
      initialUrl: `/message/${THREAD_ID}`,
    });

    expect(await screen.findByText('Borrow more, buy less.')).toBeTruthy();
    expect(getPathname()).toBe('/sign-in');
  });
});
