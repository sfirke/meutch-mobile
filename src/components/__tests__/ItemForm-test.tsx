import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { ApiError, RequestTimeoutError } from '../../lib/api';
import { UPLOAD_ERROR_OVERRIDES } from '../../lib/errorCopy';
import type { PhotoChanges, PhotoDraft } from '../../lib/itemPhotos';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  defaultProfileFixture,
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
  type MockRoute,
} from '../../test-utils/renderWithProviders';
import {
  ItemForm,
  PUBLIC_LOCATION_HINT,
  type ItemFormProps,
} from '../ItemForm';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const CATEGORIES = {
  categories: [
    { id: 'cat-tools', name: 'Tools' },
    { id: 'cat-books', name: 'Books' },
  ],
};

const NO_PHOTO_CHANGES = { photos: [], deletedImageIds: [] };

const launchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;

const existing = (id: string): PhotoDraft => ({
  kind: 'existing',
  id,
  url: `https://example.com/${id}.jpg`,
});

const READY = { name: 'Drill', category_id: 'cat-tools' };

const TAGS = { tags: [{ id: 'tag-drill', name: 'drill' }] };

function renderForm(
  props?: Partial<ItemFormProps>,
  routes?: Record<string, MockRoute>,
) {
  const apiFetch = mockApiFetch({
    '/categories': CATEGORIES,
    '/tags': TAGS,
    '/me/profile': { user: defaultProfileFixture },
    ...routes,
  });
  mockSession({ authenticatedApiFetch: apiFetch });

  const allProps: ItemFormProps = {
    onSubmit: jest.fn(),
    pending: false,
    error: null,
    submitLabel: 'List item',
    ...props,
  };
  const result = renderWithProviders(<ItemForm {...allProps} />);

  return { ...result, apiFetch, props: allProps };
}

// Lets a test inject the mutation error after the form has mounted.
function ErrorHarness(props: Omit<ItemFormProps, 'error'>) {
  const [error, setError] = useState<unknown>(null);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          setError(
            new ApiError({ code: 'CONFLICT', message: 'x', status: 409 }),
          )
        }
      >
        <Text>Fail</Text>
      </Pressable>
      <ItemForm {...props} error={error} />
    </>
  );
}

// Goes pending on submit; "Time out" then fails the save like the mutation would.
function SubmitHarness(props: Omit<ItemFormProps, 'error' | 'pending'>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setPending(false);
          setError(new RequestTimeoutError());
        }}
      >
        <Text>Time out</Text>
      </Pressable>
      <ItemForm
        {...props}
        error={error}
        onSubmit={(input, photos) => {
          props.onSubmit(input, photos);
          setPending(true);
        }}
        pending={pending}
      />
    </>
  );
}

function renderSubmitHarness() {
  mockSession({
    authenticatedApiFetch: mockApiFetch({
      '/categories': CATEGORIES,
      '/tags': TAGS,
      '/me/profile': { user: defaultProfileFixture },
    }),
  });
  renderWithProviders(
    <SubmitHarness
      initialValues={READY}
      onSubmit={jest.fn()}
      submitLabel="List item"
    />,
  );
}

async function addPhotoFromLibrary(uri: string, expectedCount: number) {
  launchLibrary.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri, width: 100, height: 100 }],
  });
  fireEvent.press(screen.getByLabelText('Add photo'));
  fireEvent.press(screen.getByText('Choose from library'));
  await waitFor(() =>
    expect(screen.getByTestId('photo-count')).toHaveTextContent(
      `${expectedCount} of 8 photos`,
    ),
  );
}

function submittedPhotos(onSubmit: ItemFormProps['onSubmit']): PhotoChanges {
  return jest.mocked(onSubmit).mock.lastCall?.[1] as PhotoChanges;
}

function submitButton(label = 'List item') {
  return screen.getByRole('button', { name: label });
}

async function chooseCategory(name: string, id: string) {
  fireEvent.press(
    await screen.findByRole('button', { name: 'Category: Choose a category' }),
  );
  fireEvent.press(
    within(screen.getByTestId('option-sheet')).getByTestId(`option-${id}`),
  );
  expect(
    screen.getByRole('button', { name: `Category: ${name}` }),
  ).toBeTruthy();
}

function selectTab(controlLabel: string, tabName: string) {
  fireEvent.press(
    within(screen.getByLabelText(controlLabel)).getByRole('tab', {
      name: tabName,
    }),
  );
}

// Waits for the lookups to land so their updates don't escape act().
async function settle() {
  await screen.findByRole('button', { name: /^Category: (?!Loading)/ });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ItemForm', () => {
  test('prefills from initial values and submits them unchanged', async () => {
    const { props } = renderForm({
      initialValues: {
        name: 'Ladder',
        description: 'Six feet',
        category_id: 'cat-tools',
        tags: ['outdoor'],
        is_giveaway: true,
        giveaway_visibility: 'public',
      },
      submitLabel: 'Save changes',
    });

    expect(
      await screen.findByRole('button', { name: 'Category: Tools' }),
    ).toBeTruthy();
    expect(screen.getByTestId('item-name').props.value).toBe('Ladder');
    expect(screen.getByTestId('item-description').props.value).toBe('Six feet');
    expect(screen.getByText('outdoor')).toBeTruthy();
    expect(
      within(screen.getByLabelText('Who can see it')).getByRole('tab', {
        name: 'Public',
      }),
    ).toBeSelected();

    fireEvent.press(submitButton('Save changes'));
    expect(props.onSubmit).toHaveBeenCalledWith(
      {
        name: 'Ladder',
        description: 'Six feet',
        category_id: 'cat-tools',
        tags: ['outdoor'],
        is_giveaway: true,
        giveaway_visibility: 'public',
      },
      NO_PHOTO_CHANGES,
    );
  });

  test('enables submit only once a name and category are set', async () => {
    const { props } = renderForm();

    expect(
      await screen.findByRole('button', {
        name: 'Category: Choose a category',
      }),
    ).toBeTruthy();
    expect(submitButton()).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('Name'), '   ');
    expect(submitButton()).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('Name'), '  Drill  ');
    expect(submitButton()).toBeDisabled();

    await chooseCategory('Books', 'cat-books');
    expect(submitButton()).toBeEnabled();

    fireEvent.press(submitButton());
    expect(props.onSubmit).toHaveBeenCalledWith(
      {
        name: 'Drill',
        description: null,
        category_id: 'cat-books',
        tags: [],
        is_giveaway: false,
        giveaway_visibility: null,
      },
      NO_PHOTO_CHANGES,
    );
  });

  test('lists categories sorted by name', async () => {
    renderForm();

    fireEvent.press(
      await screen.findByRole('button', {
        name: 'Category: Choose a category',
      }),
    );

    const sheet = within(screen.getByTestId('option-sheet'));
    expect(sheet.getAllByRole('button').map((row) => row.props.testID)).toEqual(
      ['option-cat-books', 'option-cat-tools'],
    );
  });

  test('shows a loading row while categories load', async () => {
    let resolveCategories: (response: Response) => void = () => undefined;
    const routes = mockApiFetch({
      '/tags': TAGS,
      '/me/profile': { user: defaultProfileFixture },
    });
    mockSession({
      authenticatedApiFetch: jest.fn(
        async (path: string, init?: RequestInit) =>
          path === '/categories'
            ? new Promise<Response>((resolve) => {
                resolveCategories = resolve;
              })
            : routes(path, init),
      ),
    });
    renderWithProviders(
      <ItemForm
        error={null}
        onSubmit={jest.fn()}
        pending={false}
        submitLabel="List item"
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Category: Loading categories...' }),
    ).toBeDisabled();

    resolveCategories(jsonResponse(CATEGORIES));
    await settle();
  });

  test('counts description characters and sends trimmed text', async () => {
    const { props } = renderForm({
      initialValues: { name: 'Drill', category_id: 'cat-tools' },
    });

    expect(screen.getByTestId('item-description-counter')).toHaveTextContent(
      '0/500',
    );
    fireEvent.changeText(screen.getByLabelText('Description'), ' Cordless ');
    expect(screen.getByTestId('item-description-counter')).toHaveTextContent(
      '10/500',
    );
    expect(screen.getByLabelText('Description').props.maxLength).toBe(500);
    expect(screen.getByLabelText('Name').props.maxLength).toBe(100);

    await screen.findByRole('button', { name: 'Category: Tools' });
    fireEvent.press(submitButton());
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Cordless' }),
      expect.anything(),
    );
  });

  test('passes tags through, including suggestions', async () => {
    const { props } = renderForm({
      initialValues: { name: 'Drill', category_id: 'cat-tools' },
    });
    await screen.findByRole('button', { name: 'Category: Tools' });

    fireEvent.changeText(screen.getByTestId('tag-input-field'), 'dr');
    fireEvent.press(await screen.findByRole('button', { name: 'Add drill' }));
    fireEvent.changeText(screen.getByTestId('tag-input-field'), 'Power,');

    fireEvent.press(submitButton());
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['drill', 'power'] }),
      expect.anything(),
    );
  });

  test('giveaway reveals visibility, defaults to circles, and lend sends null', async () => {
    const { props } = renderForm({
      initialValues: { name: 'Drill', category_id: 'cat-tools' },
    });
    await screen.findByRole('button', { name: 'Category: Tools' });

    expect(screen.queryByLabelText('Who can see it')).toBeNull();
    selectTab('Item type', 'Give away');
    expect(
      within(screen.getByLabelText('Who can see it')).getByRole('tab', {
        name: 'My circles',
      }),
    ).toBeSelected();

    fireEvent.press(submitButton());
    expect(props.onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        is_giveaway: true,
        giveaway_visibility: 'default',
      }),
      expect.anything(),
    );

    selectTab('Who can see it', 'Public');
    selectTab('Item type', 'Lend');
    expect(screen.queryByLabelText('Who can see it')).toBeNull();

    fireEvent.press(submitButton());
    expect(props.onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        is_giveaway: false,
        giveaway_visibility: null,
      }),
      expect.anything(),
    );
  });

  test('hints at a missing location for public giveaways', async () => {
    renderForm({ initialValues: { is_giveaway: true } });

    selectTab('Who can see it', 'Public');
    expect(await screen.findByText(PUBLIC_LOCATION_HINT)).toBeTruthy();

    selectTab('Who can see it', 'My circles');
    expect(screen.queryByText(PUBLIC_LOCATION_HINT)).toBeNull();
  });

  test('shows no location hint when the profile has a location', async () => {
    renderForm(
      { initialValues: { is_giveaway: true, giveaway_visibility: 'public' } },
      {
        '/me/profile': {
          user: { ...defaultProfileFixture, has_location: true },
        },
      },
    );

    await screen.findByRole('button', { name: 'Category: Choose a category' });
    expect(screen.queryByText(PUBLIC_LOCATION_HINT)).toBeNull();
  });

  test('pending shows Saving... and disables the inputs', async () => {
    renderForm({
      initialValues: { name: 'Drill', category_id: 'cat-tools' },
      pending: true,
    });

    expect(
      await screen.findByRole('button', { name: 'Category: Tools' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByLabelText('Name').props.editable).toBe(false);
    expect(screen.getByLabelText('Description').props.editable).toBe(false);
    expect(screen.getByTestId('tag-input-field').props.editable).toBe(false);
  });

  test('renders a 422 beside its field with no general message', async () => {
    renderForm({
      error: new ApiError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input.',
        status: 422,
        details: { name: ['Too long.'] },
      }),
    });

    expect(screen.getByTestId('field-error-name')).toHaveTextContent(
      'Too long.',
    );
    expect(screen.queryByTestId('item-form-error')).toBeNull();

    await settle();
  });

  test('renders other errors as the general message', async () => {
    renderForm({
      error: new ApiError({
        code: 'CONFLICT',
        message: 'This item was already listed.',
        status: 409,
      }),
    });

    expect(screen.getByTestId('item-form-error')).toHaveTextContent(
      'This item was already listed.',
    );

    await settle();
  });

  test('editing after an error calls onClearError', async () => {
    const onClearError = jest.fn();
    mockSession({
      authenticatedApiFetch: mockApiFetch({
        '/categories': CATEGORIES,
        '/tags': TAGS,
        '/me/profile': { user: defaultProfileFixture },
      }),
    });
    renderWithProviders(
      <ErrorHarness
        onClearError={onClearError}
        onSubmit={jest.fn()}
        pending={false}
        submitLabel="List item"
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Name'), 'Drill');
    expect(onClearError).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Fail' }));
    fireEvent.changeText(screen.getByLabelText('Name'), 'Drills');
    expect(onClearError).toHaveBeenCalledTimes(1);

    await settle();
  });

  test('reports dirty when edited and clean when reverted', async () => {
    const onDirtyChange = jest.fn();
    renderForm({
      initialValues: { name: 'Drill', description: null },
      onDirtyChange,
    });

    expect(onDirtyChange).not.toHaveBeenCalled();

    // Whitespace and an empty description normalize to the initial values.
    fireEvent.changeText(screen.getByLabelText('Name'), 'Drill ');
    fireEvent.changeText(screen.getByLabelText('Description'), ' ');
    expect(onDirtyChange).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Name'), 'Drill press');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    fireEvent.changeText(screen.getByLabelText('Name'), 'Drill');
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(onDirtyChange).toHaveBeenCalledTimes(2);

    await settle();
  });

  test('a categories error shows Retry, which refetches', async () => {
    let calls = 0;
    const { apiFetch } = renderForm(undefined, {
      '/categories': () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(
              { error: { code: 'SERVER_ERROR', message: 'Oops.' } },
              500,
            )
          : CATEGORIES;
      },
    });

    fireEvent.press(await screen.findByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByRole('button', {
        name: 'Category: Choose a category',
      }),
    ).toBeTruthy();
    expect(
      apiFetch.mock.calls.filter(([path]) => path === '/categories'),
    ).toHaveLength(2);
  });
  test('renders the photo grid with the initial photos', async () => {
    renderForm({ initialPhotos: [existing('img-a'), existing('img-b')] });

    expect(screen.getByText('Photos')).toBeTruthy();
    expect(screen.getByTestId('photo-grid')).toBeTruthy();
    expect(screen.getByLabelText('Photo 1 of 2')).toBeTruthy();
    expect(screen.getByTestId('photo-count')).toHaveTextContent(
      '2 of 8 photos',
    );

    await settle();
  });

  test('adding a photo makes the form dirty and submits a new draft', async () => {
    const onDirtyChange = jest.fn();
    const { props } = renderForm({ initialValues: READY, onDirtyChange });
    await settle();

    await addPhotoFromLibrary('file:///drill.jpg', 1);
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    fireEvent.press(submitButton());
    const changes = submittedPhotos(props.onSubmit);
    expect(changes.deletedImageIds).toEqual([]);
    expect(changes.photos).toEqual([
      expect.objectContaining({ kind: 'new', uri: 'file:///drill.jpg' }),
    ]);
  });

  test('removing an existing photo submits its id and the rest', async () => {
    const onDirtyChange = jest.fn();
    const { props } = renderForm({
      initialValues: READY,
      initialPhotos: [existing('img-a'), existing('img-b')],
      onDirtyChange,
    });
    await settle();
    expect(onDirtyChange).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Remove photo 1'));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    fireEvent.press(submitButton());
    expect(submittedPhotos(props.onSubmit)).toEqual({
      photos: [existing('img-b')],
      deletedImageIds: ['img-a'],
    });
  });

  test('Move later on the first photo submits the swapped order', async () => {
    const { props } = renderForm({
      initialValues: READY,
      initialPhotos: [existing('img-a'), existing('img-b')],
    });
    await settle();

    fireEvent(screen.getByTestId('photo-0'), 'accessibilityAction', {
      nativeEvent: { actionName: 'moveLater' },
    });

    fireEvent.press(submitButton());
    expect(submittedPhotos(props.onSubmit)).toEqual({
      photos: [existing('img-b'), existing('img-a')],
      deletedImageIds: [],
    });
  });

  test('hides the add tile at the 8-photo cap', async () => {
    renderForm({
      initialPhotos: Array.from({ length: 8 }, (_, i) => existing(`img-${i}`)),
    });

    expect(screen.queryByLabelText('Add photo')).toBeNull();
    expect(screen.getByTestId('photo-count')).toHaveTextContent(
      '8 of 8 photos',
    );

    await settle();
  });

  test('pending with new photos shows Uploading photos... and upload error copy', async () => {
    renderSubmitHarness();
    await settle();
    await addPhotoFromLibrary('file:///drill.jpg', 1);

    fireEvent.press(submitButton());
    expect(
      screen.getByRole('button', { name: 'Uploading photos...' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Add photo')).toBeDisabled();

    fireEvent.press(screen.getByRole('button', { name: 'Time out' }));
    expect(screen.getByTestId('item-form-error')).toHaveTextContent(
      UPLOAD_ERROR_OVERRIDES.TIMEOUT?.message ?? '',
    );
  });

  test('pending without new photos shows Saving... and the usual error copy', async () => {
    renderSubmitHarness();
    await settle();

    fireEvent.press(submitButton());
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();

    fireEvent.press(screen.getByRole('button', { name: 'Time out' }));
    expect(screen.getByTestId('item-form-error')).not.toHaveTextContent(
      UPLOAD_ERROR_OVERRIDES.TIMEOUT?.message ?? '',
    );
  });
});
