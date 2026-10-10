import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { pickFromLibrary } from '../../lib/photoPicker';
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
import { EditProfileScreen } from '../EditProfileScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

jest.mock('../../lib/photoPicker');

type LeaveEvent = {
  preventDefault: jest.Mock;
  data: { action: { type: string } };
};

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
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useNavigation: () => mockNavigation,
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const mockPickFromLibrary = pickFromLibrary as jest.MockedFunction<
  typeof pickFromLibrary
>;

const PROFILE = {
  ...defaultProfileFixture,
  profile_image_url: 'https://example.com/fake-member.jpg',
  web_links: [
    {
      id: 'link-1',
      platform_type: 'website',
      platform_name: '',
      display_name: 'Website',
      url: 'https://fake-member.example.com',
      display_order: 0,
    },
    {
      id: 'link-2',
      platform_type: 'other',
      platform_name: 'Portfolio',
      display_name: 'Portfolio',
      url: 'https://portfolio.example.com',
      display_order: 1,
    },
  ],
};

function validationError(details: Record<string, unknown>) {
  return jsonResponse(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input.',
        details,
      },
    },
    422,
  );
}

function renderScreen(patch: MockRoute = { user: PROFILE }) {
  const apiFetch = mockApiFetch({
    'GET /me/profile': { user: PROFILE },
    'PATCH /me/profile': patch,
  });

  mockSession({ authenticatedApiFetch: apiFetch });
  renderWithProviders(<EditProfileScreen />);

  return apiFetch;
}

function patchBodies(apiFetch: ReturnType<typeof mockApiFetch>) {
  return apiFetch.mock.calls
    .filter(
      ([path, init]) => path === '/me/profile' && init?.method === 'PATCH',
    )
    .map(([, init]) => getRequestBody(init));
}

function saveButton() {
  return screen.getByRole('button', { name: 'Save' });
}

async function settle() {
  await screen.findByTestId('field-first_name');
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('edit profile screen', () => {
  test('prefills names and links from the profile', async () => {
    renderScreen();
    await settle();

    expect(screen.getByTestId('field-first_name').props.value).toBe('Fake');
    expect(screen.getByTestId('field-last_name').props.value).toBe('Member');
    expect(screen.getByTestId('field-link-saved-link-1-url').props.value).toBe(
      'https://fake-member.example.com',
    );
    expect(screen.getByTestId('field-link-saved-link-2-name').props.value).toBe(
      'Portfolio',
    );
    expect(screen.getByTestId('field-link-saved-link-2-url').props.value).toBe(
      'https://portfolio.example.com',
    );
    expect(saveButton()).toBeDisabled();
  });

  test('sends only a changed first name, trimmed, and goes back', async () => {
    const apiFetch = renderScreen();
    await settle();

    fireEvent.changeText(screen.getByTestId('field-first_name'), '  Ada  ');
    expect(saveButton()).toBeEnabled();
    fireEvent.press(saveButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(patchBodies(apiFetch)).toEqual([{ first_name: 'Ada' }]);
  });

  test('sends links with a scheme added and no name fields', async () => {
    const apiFetch = renderScreen();
    await settle();

    fireEvent.changeText(
      screen.getByTestId('field-link-saved-link-1-url'),
      'new.example.com',
    );
    fireEvent.press(saveButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(patchBodies(apiFetch)).toEqual([
      {
        links: [
          {
            platform: 'website',
            custom_name: null,
            url: 'https://new.example.com',
          },
          {
            platform: 'other',
            custom_name: 'Portfolio',
            url: 'https://portfolio.example.com',
          },
        ],
      },
    ]);
  });

  test('adding a blank link row leaves the form clean', async () => {
    renderScreen();
    await settle();

    fireEvent.press(screen.getByTestId('link-add'));

    expect(screen.getByText('3 of 5 links')).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();
  });

  test('removing the photo sends only delete_image', async () => {
    const apiFetch = renderScreen({
      user: { ...PROFILE, profile_image_url: null },
    });
    await settle();

    fireEvent.press(screen.getByText('Change photo'));
    fireEvent.press(screen.getByText('Remove photo'));
    fireEvent.press(saveButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(patchBodies(apiFetch)).toEqual([{ delete_image: true }]);
  });

  test('a failed photo upload keeps the screen and the pending photo', async () => {
    mockPickFromLibrary.mockResolvedValueOnce({
      kind: 'picked',
      photos: [{ uri: 'file:///picked.jpg', width: 100, height: 100 }],
    });
    const apiFetch = renderScreen({
      user: { ...PROFILE, first_name: 'Ada' },
      image_upload_failed: true,
    });
    await settle();

    fireEvent.changeText(screen.getByTestId('field-first_name'), 'Ada');
    fireEvent.press(screen.getByText('Change photo'));
    fireEvent.press(screen.getByText('Choose from library'));
    await waitFor(() =>
      expect(screen.getByTestId('profile-photo-avatar').props.source).toEqual([
        { uri: 'file:///picked.jpg' },
      ]),
    );
    fireEvent.press(saveButton());

    expect(
      await screen.findByText(
        'Your other changes were saved, but the photo could not be uploaded. Please try again.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('edit-profile-feedback')).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    expect(patchBodies(apiFetch)).toHaveLength(1);
    const parts = patchBodies(apiFetch)[0] as [string, unknown][];
    expect(parts[0]).toEqual(['first_name', 'Ada']);
    expect(parts.map(([name]) => name)).toEqual([
      'first_name',
      'profile_image',
    ]);
    expect(screen.getByTestId('field-first_name').props.value).toBe('Ada');
    expect(screen.getByTestId('profile-photo-avatar').props.source).toEqual([
      { uri: 'file:///picked.jpg' },
    ]);
    expect(saveButton()).toBeEnabled();
  });

  test('shows a 422 name message under the field', async () => {
    renderScreen(
      validationError({ first_name: ['Please enter a real name.'] }),
    );
    await settle();

    fireEvent.changeText(screen.getByTestId('field-first_name'), 'Xx');
    fireEvent.press(saveButton());

    expect(
      await screen.findByTestId('field-error-first_name'),
    ).toHaveTextContent('Please enter a real name.');
    expect(screen.queryByTestId('edit-profile-error')).toBeNull();
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('maps a link error by sent index past a blank row', async () => {
    const apiFetch = renderScreen(
      validationError({ links: { '0': { url: ['Enter a valid URL.'] } } }),
    );
    await settle();

    fireEvent.changeText(screen.getByTestId('field-link-saved-link-1-url'), '');
    fireEvent.press(saveButton());

    expect(
      await screen.findByTestId('field-error-link-saved-link-2-url'),
    ).toHaveTextContent('Enter a valid URL.');
    expect(
      screen.queryByTestId('field-error-link-saved-link-1-url'),
    ).toBeNull();
    expect(screen.queryByTestId('edit-profile-error')).toBeNull();
    expect(patchBodies(apiFetch)).toEqual([
      {
        links: [
          {
            platform: 'other',
            custom_name: 'Portfolio',
            url: 'https://portfolio.example.com',
          },
        ],
      },
    ]);
  });

  test('a blank first name blocks the save', async () => {
    const apiFetch = renderScreen();
    await settle();

    fireEvent.changeText(screen.getByTestId('field-first_name'), '   ');
    fireEvent.press(saveButton());

    expect(screen.getByTestId('field-error-first_name')).toHaveTextContent(
      'Enter your first name',
    );
    expect(patchBodies(apiFetch)).toEqual([]);
  });

  test('asks before discarding unsaved edits', async () => {
    renderScreen();
    await settle();

    fireEvent.changeText(screen.getByTestId('field-last_name'), 'Example');

    const event: LeaveEvent = {
      preventDefault: jest.fn(),
      data: { action: { type: 'GO_BACK' } },
    };
    act(() => mockListeners.beforeRemove(event));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(screen.getByText('Discard changes?')).toBeOnTheScreen();
    expect(
      screen.getByText("Your edits haven't been saved."),
    ).toBeOnTheScreen();
  });
});
