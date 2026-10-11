import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ImageManipulator } from 'expo-image-manipulator';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import { PhotoEditor } from '../PhotoEditor';

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const manipulate = ImageManipulator.manipulate as jest.Mock;
const URI = 'file:///photo.jpg';

function contexts() {
  return manipulate.mock.results.map((result) => result.value);
}

// A 360x600 stage leaves a 312x552 frame, so a 4:3 photo is fitted at
// 312x234. The manipulator mock renders every image at 1600x1200.
function renderEditor() {
  const onCancel = jest.fn();
  const onDone = jest.fn();

  render(<PhotoEditor onCancel={onCancel} onDone={onDone} uri={URI} />);
  fireEvent(screen.getByTestId('photo-editor-stage'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 600 } },
  });
  fireEvent(screen.getByTestId('photo-editor-image'), 'load', {
    nativeEvent: { source: { url: URI, width: 400, height: 300 } },
  });

  return { onCancel, onDone };
}

async function pressDone() {
  await act(async () => {
    fireEvent.press(screen.getByTestId('photo-editor-done'));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders nothing without a photo', () => {
  render(<PhotoEditor onCancel={jest.fn()} onDone={jest.fn()} uri={null} />);

  expect(screen.queryByTestId('photo-editor')).toBeNull();
});

it('waits for the photo before enabling the tools', () => {
  render(<PhotoEditor onCancel={jest.fn()} onDone={jest.fn()} uri={URI} />);

  expect(screen.getByTestId('photo-editor-loading')).toBeOnTheScreen();
  expect(screen.getByLabelText('Rotate left')).toBeDisabled();
  expect(screen.getByTestId('photo-editor-done')).toBeDisabled();
});

it('closes without a new file when nothing was changed', async () => {
  const { onCancel, onDone } = renderEditor();

  expect(screen.queryByTestId('photo-editor-loading')).toBeNull();
  await pressDone();

  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onDone).not.toHaveBeenCalled();
  expect(manipulate).not.toHaveBeenCalled();
});

it('cancels', () => {
  const { onCancel } = renderEditor();

  fireEvent.press(screen.getByTestId('photo-editor-cancel'));

  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('rotates the whole photo', async () => {
  const { onDone } = renderEditor();

  fireEvent.press(screen.getByLabelText('Rotate left'));
  await pressDone();

  const [source, cropped] = contexts();

  expect(manipulate).toHaveBeenNthCalledWith(1, URI);
  expect(source.rotate).toHaveBeenCalledWith(270);
  expect(cropped.crop).toHaveBeenCalledWith({
    originX: 0,
    originY: 0,
    width: 1600,
    height: 1200,
  });
  expect(onDone).toHaveBeenCalledWith({ uri: URI, width: 1600, height: 1200 });
});

it('crops to the zoomed-in area', async () => {
  renderEditor();

  fireEvent.press(screen.getByLabelText('Zoom in'));
  await pressDone();

  // One 1.25x step keeps the middle 80% of each side.
  expect(contexts()[1].crop).toHaveBeenCalledWith({
    originX: 160,
    originY: 120,
    width: 1280,
    height: 960,
  });
});

it('crops to the dragged corner', async () => {
  renderEditor();

  fireGestureHandler(getByGestureTestId('photo-editor-crop-bottomRight'), [
    { translationX: 0, translationY: 0 },
    { translationX: -156, translationY: -117 },
  ]);
  await pressDone();

  expect(contexts()[1].crop).toHaveBeenCalledWith({
    originX: 0,
    originY: 0,
    width: 800,
    height: 600,
  });
});

it('reset undoes the rotation and the crop', async () => {
  const { onCancel, onDone } = renderEditor();

  fireEvent.press(screen.getByLabelText('Rotate right'));
  fireEvent.press(screen.getByLabelText('Zoom in'));
  fireEvent.press(screen.getByTestId('photo-editor-reset'));
  await pressDone();

  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onDone).not.toHaveBeenCalled();
});

it('reports a failed edit and lets the user retry', async () => {
  const { onDone } = renderEditor();

  manipulate.mockImplementationOnce(() => {
    throw new Error('load failed');
  });
  fireEvent.press(screen.getByLabelText('Rotate right'));
  await pressDone();

  expect(screen.getByTestId('photo-editor-hint')).toHaveTextContent(
    "This photo couldn't be edited. Try again.",
  );
  expect(onDone).not.toHaveBeenCalled();

  await pressDone();

  await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
});
