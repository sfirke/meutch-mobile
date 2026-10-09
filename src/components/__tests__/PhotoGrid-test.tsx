import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

import type { PhotoDraft } from '../../lib/itemPhotos';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { PhotoGrid } from '../PhotoGrid';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const launchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
const requestLibrary =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const requestCamera = ImagePicker.requestCameraPermissionsAsync as jest.Mock;

const existing = (id: string): PhotoDraft => ({
  kind: 'existing',
  id,
  url: `https://example.com/${id}.jpg`,
});
const fresh = (key: string): PhotoDraft => ({
  kind: 'new',
  key,
  uri: `file:///${key}.jpg`,
});

const three = [existing('a'), fresh('b'), existing('c')];

function renderGrid(props: Partial<Parameters<typeof PhotoGrid>[0]> = {}) {
  const onChange = jest.fn();
  const onRemoveExisting = jest.fn();

  render(
    <PhotoGrid
      onChange={onChange}
      onRemoveExisting={onRemoveExisting}
      photos={three}
      {...props}
    />,
  );

  return { onChange, onRemoveExisting };
}

function accessibilityAction(index: number, actionName: string) {
  fireEvent(screen.getByTestId(`photo-${index}`), 'accessibilityAction', {
    nativeEvent: { actionName },
  });
}

async function chooseSource(label: string) {
  fireEvent.press(screen.getByLabelText('Add photo'));
  fireEvent.press(screen.getByText(label));
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders thumbnails, the cover badge, and the count', () => {
  renderGrid();

  expect(screen.getByLabelText('Photo 1 of 3')).toBeOnTheScreen();
  expect(screen.getByLabelText('Photo 3 of 3')).toBeOnTheScreen();
  expect(screen.getAllByText('Cover')).toHaveLength(1);
  expect(screen.getByTestId('photo-count')).toHaveTextContent('3 of 8 photos');
  expect(screen.getByTestId('photo-grid')).toBeOnTheScreen();
});

it('shows a placeholder for an existing photo without a url', () => {
  renderGrid({ photos: [{ kind: 'existing', id: 'x', url: null }] });

  expect(screen.getByTestId('photo-0-placeholder')).toBeOnTheScreen();
});

it('removes an existing photo and reports its id', () => {
  const { onChange, onRemoveExisting } = renderGrid();

  fireEvent.press(screen.getByLabelText('Remove photo 1'));

  expect(onChange).toHaveBeenCalledWith([three[1], three[2]]);
  expect(onRemoveExisting).toHaveBeenCalledWith('a');
});

it('removes a new photo without reporting an id', () => {
  const { onChange, onRemoveExisting } = renderGrid();

  fireEvent.press(screen.getByLabelText('Remove photo 2'));

  expect(onChange).toHaveBeenCalledWith([three[0], three[2]]);
  expect(onRemoveExisting).not.toHaveBeenCalled();
});

it('opens the source sheet from the add tile', () => {
  renderGrid();

  fireEvent.press(screen.getByLabelText('Add photo'));

  expect(screen.getByText('Take photo')).toBeOnTheScreen();
  expect(screen.getByText('Choose from library')).toBeOnTheScreen();
});

it('appends photos chosen from the library', async () => {
  launchLibrary.mockResolvedValueOnce({
    canceled: false,
    assets: [
      { uri: 'file:///one.jpg', width: 100, height: 100 },
      { uri: 'file:///two.jpg', width: 100, height: 100 },
    ],
  });
  const { onChange } = renderGrid();

  await chooseSource('Choose from library');

  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect(launchLibrary).toHaveBeenCalledWith(
    expect.objectContaining({ selectionLimit: 5 }),
  );
  const next = onChange.mock.calls[0][0] as PhotoDraft[];
  expect(next).toHaveLength(5);
  expect(next.slice(0, 3)).toEqual(three);
  expect(next[3]).toMatchObject({ kind: 'new', uri: 'file:///one.jpg' });
  expect(next[4]).toMatchObject({ kind: 'new', uri: 'file:///two.jpg' });
  expect(next[3]).not.toEqual(next[4]);
});

it('allows only one more photo at seven and hides the add tile at eight', async () => {
  const seven = Array.from({ length: 7 }, (_, i) => fresh(`p${i}`));
  launchLibrary.mockResolvedValueOnce({
    canceled: false,
    assets: [
      { uri: 'file:///one.jpg', width: 100, height: 100 },
      { uri: 'file:///two.jpg', width: 100, height: 100 },
    ],
  });
  const { onChange } = renderGrid({ photos: seven });

  await chooseSource('Choose from library');

  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect(launchLibrary).toHaveBeenCalledWith(
    expect.objectContaining({ selectionLimit: 1 }),
  );
  expect(onChange.mock.calls[0][0]).toHaveLength(8);

  screen.rerender(
    <PhotoGrid onChange={onChange} photos={[...seven, fresh('p7')]} />,
  );
  expect(screen.queryByLabelText('Add photo')).toBeNull();
  expect(screen.getByTestId('photo-count')).toHaveTextContent('8 of 8 photos');
});

it('explains denied library access and opens settings', async () => {
  const openSettings = jest
    .spyOn(Linking, 'openSettings')
    .mockResolvedValue(undefined);
  requestLibrary.mockResolvedValueOnce({ granted: false, status: 'denied' });
  const { onChange } = renderGrid();

  await chooseSource('Choose from library');

  const message = await screen.findByTestId('photo-permission-denied');
  expect(message).toHaveTextContent(
    'Meutch needs photo library access to add photos.',
    { exact: false },
  );
  fireEvent.press(screen.getByText('Open settings'));
  expect(openSettings).toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
  openSettings.mockRestore();
});

it('explains denied camera access', async () => {
  requestCamera.mockResolvedValueOnce({ granted: false, status: 'denied' });
  renderGrid();

  await chooseSource('Take photo');

  expect(
    await screen.findByTestId('photo-permission-denied'),
  ).toHaveTextContent('Meutch needs camera access to take photos.', {
    exact: false,
  });
});

it('does nothing when picking is cancelled', async () => {
  const { onChange } = renderGrid();

  await chooseSource('Take photo');

  await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());
  await act(async () => {});
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.queryByTestId('photo-permission-denied')).toBeNull();
});

it('reorders with the accessibility actions', () => {
  const { onChange } = renderGrid();

  accessibilityAction(0, 'moveLater');
  expect(onChange).toHaveBeenLastCalledWith([three[1], three[0], three[2]]);

  accessibilityAction(2, 'moveEarlier');
  expect(onChange).toHaveBeenLastCalledWith([three[0], three[2], three[1]]);
});

it('ignores moves past either end', () => {
  const { onChange } = renderGrid();

  accessibilityAction(0, 'moveEarlier');
  accessibilityAction(2, 'moveLater');

  expect(onChange).not.toHaveBeenCalled();
});

it('disables remove and add when disabled', () => {
  const { onChange } = renderGrid({ disabled: true });

  const remove = screen.getByLabelText('Remove photo 1');
  const add = screen.getByLabelText('Add photo');
  expect(remove).toBeDisabled();
  expect(add).toBeDisabled();

  fireEvent.press(remove);
  fireEvent.press(add);
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.queryByText('Take photo')).toBeNull();
});
