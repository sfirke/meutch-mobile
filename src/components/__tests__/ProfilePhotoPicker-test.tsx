import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Linking } from 'react-native';

import { pickFromLibrary, takePhoto } from '../../lib/photoPicker';
import type { ProfilePhotoChange } from '../../lib/profile';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import type { AvatarUser } from '../Avatar';
import { ProfilePhotoPicker } from '../ProfilePhotoPicker';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);
jest.mock('../../lib/photoPicker');

const mockTakePhoto = takePhoto as jest.MockedFunction<typeof takePhoto>;
const mockPickFromLibrary = pickFromLibrary as jest.MockedFunction<
  typeof pickFromLibrary
>;

const member: AvatarUser = {
  first_name: 'Fake',
  last_name: 'Member',
  full_name: 'Fake Member',
  profile_image_url: null,
};
const withPhoto: AvatarUser = {
  ...member,
  profile_image_url: 'https://example.com/fake-member.jpg',
};
const picked = {
  kind: 'picked' as const,
  photos: [{ uri: 'file:///picked.jpg', width: 100, height: 100 }],
};

function renderPicker(
  props: { user?: AvatarUser; change?: ProfilePhotoChange | null } = {},
) {
  const onChange = jest.fn();

  render(
    <ProfilePhotoPicker
      change={props.change ?? null}
      onChange={onChange}
      user={props.user ?? member}
    />,
  );

  return { onChange };
}

function choose(label: string) {
  fireEvent.press(screen.getByText('Change photo'));
  fireEvent.press(screen.getByText(label));
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('shows initials when there is no photo', () => {
  renderPicker();

  expect(screen.getByTestId('profile-photo-picker')).toBeOnTheScreen();
  expect(screen.getByTestId('profile-photo-avatar-initials')).toBeOnTheScreen();
  expect(screen.getByText('FM')).toBeOnTheScreen();
});

test('shows the saved photo', () => {
  renderPicker({ user: withPhoto });

  expect(screen.getByTestId('profile-photo-avatar').props.source).toEqual([
    { uri: withPhoto.profile_image_url },
  ]);
});

test('shows the pending photo', () => {
  renderPicker({
    user: withPhoto,
    change: { kind: 'new', uri: 'file:///pending.jpg' },
  });

  expect(screen.getByTestId('profile-photo-avatar').props.source).toEqual([
    { uri: 'file:///pending.jpg' },
  ]);
});

test('shows initials when the saved photo is marked removed', () => {
  renderPicker({ user: withPhoto, change: { kind: 'remove' } });

  expect(screen.getByTestId('profile-photo-avatar-initials')).toBeOnTheScreen();
});

test('offers Remove photo only when there is something to remove', () => {
  renderPicker();
  fireEvent.press(screen.getByTestId('profile-photo-change'));

  expect(screen.getByText('Profile photo')).toBeOnTheScreen();
  expect(screen.getByText('Take photo')).toBeOnTheScreen();
  expect(screen.getByText('Choose from library')).toBeOnTheScreen();
  expect(screen.queryByText('Remove photo')).toBeNull();

  screen.unmount();
  renderPicker({ user: withPhoto });
  fireEvent.press(screen.getByTestId('profile-photo-change'));
  expect(screen.getByText('Remove photo')).toBeOnTheScreen();

  screen.unmount();
  renderPicker({ user: withPhoto, change: { kind: 'remove' } });
  fireEvent.press(screen.getByTestId('profile-photo-change'));
  expect(screen.queryByText('Remove photo')).toBeNull();
});

test('takes a photo with the camera', async () => {
  mockTakePhoto.mockResolvedValueOnce(picked);
  const { onChange } = renderPicker();

  choose('Take photo');

  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith({
      kind: 'new',
      uri: 'file:///picked.jpg',
    }),
  );
  expect(mockPickFromLibrary).not.toHaveBeenCalled();
});

test('picks one photo from the library', async () => {
  mockPickFromLibrary.mockResolvedValueOnce(picked);
  const { onChange } = renderPicker();

  choose('Choose from library');

  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith({
      kind: 'new',
      uri: 'file:///picked.jpg',
    }),
  );
  expect(mockPickFromLibrary).toHaveBeenCalledWith(1);
});

test('explains denied access and opens settings', async () => {
  const openSettings = jest
    .spyOn(Linking, 'openSettings')
    .mockResolvedValue(undefined);
  mockPickFromLibrary.mockResolvedValueOnce({
    kind: 'denied',
    source: 'library',
  });
  const { onChange } = renderPicker();

  choose('Choose from library');

  expect(
    await screen.findByTestId('profile-photo-permission-denied'),
  ).toHaveTextContent('Meutch needs photo library access to choose a photo.', {
    exact: false,
  });
  fireEvent.press(screen.getByText('Open settings'));
  expect(openSettings).toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
  openSettings.mockRestore();
});

test('explains denied camera access', async () => {
  mockTakePhoto.mockResolvedValueOnce({ kind: 'denied', source: 'camera' });
  renderPicker();

  choose('Take photo');

  expect(
    await screen.findByTestId('profile-photo-permission-denied'),
  ).toHaveTextContent('Meutch needs camera access to take photos.', {
    exact: false,
  });
});

test('does nothing when picking is cancelled', async () => {
  mockTakePhoto.mockResolvedValueOnce({ kind: 'cancelled' });
  const { onChange } = renderPicker();

  choose('Take photo');

  await waitFor(() => expect(mockTakePhoto).toHaveBeenCalled());
  await act(async () => {});
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.queryByTestId('profile-photo-permission-denied')).toBeNull();
});

test('marks a saved photo for removal', () => {
  const { onChange } = renderPicker({ user: withPhoto });

  choose('Remove photo');

  expect(onChange).toHaveBeenCalledWith({ kind: 'remove' });
});

test('drops a pending photo back to unchanged when nothing is saved', () => {
  const { onChange } = renderPicker({
    change: { kind: 'new', uri: 'file:///pending.jpg' },
  });

  choose('Remove photo');

  expect(onChange).toHaveBeenCalledWith(null);
});

test('disables the change button when disabled', () => {
  const onChange = jest.fn();
  render(
    <ProfilePhotoPicker
      change={null}
      disabled
      onChange={onChange}
      user={member}
    />,
  );

  const button = screen.getByTestId('profile-photo-change');
  expect(button).toBeDisabled();
  fireEvent.press(button);
  expect(screen.queryByText('Take photo')).toBeNull();
});
