import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  defaultProfileFixture,
  mockApiFetch,
  type MockRoute,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import {
  countActiveFeedFilters,
  DEFAULT_FEED_FILTERS,
  FeedFilterSheet,
  type FeedFilters,
} from '../FeedFilterSheet';

jest.mock('../../session/SessionProvider', () => ({
  useSession: jest.fn(),
}));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

const NO_LOCATION_HINT =
  'Add a location on your profile to filter by distance.';
const DISTANCE_IDS = ['none', '5', '10', '20', '25', '50'];
const TYPE_IDS = ['requests', 'giveaways', 'loans', 'circle_joins'];

const withLocation: Record<string, MockRoute> = {
  '/me/profile': { user: { ...defaultProfileFixture, has_location: true } },
};

function renderSheet({
  visible = true,
  filters = DEFAULT_FEED_FILTERS,
  routes = {},
}: {
  visible?: boolean;
  filters?: FeedFilters;
  routes?: Record<string, MockRoute>;
} = {}) {
  const authenticatedApiFetch = mockApiFetch({
    '/me/profile': { user: defaultProfileFixture },
    ...routes,
  });
  const onApply = jest.fn();
  const onClose = jest.fn();

  mockSession({ authenticatedApiFetch });
  renderWithProviders(
    <FeedFilterSheet
      filters={filters}
      onApply={onApply}
      onClose={onClose}
      visible={visible}
    />,
  );

  return { authenticatedApiFetch, onApply, onClose };
}

function checked(testID: string) {
  return screen.getByTestId(testID).props.accessibilityState.checked;
}

// Distance rows stay disabled until the profile reports a location.
async function waitForEnabled(testID: string) {
  await waitFor(() =>
    expect(screen.getByTestId(testID).props.accessibilityState.disabled).toBe(
      false,
    ),
  );
}

function apply() {
  fireEvent.press(screen.getByTestId('filter-sheet-apply'));
}

describe('countActiveFeedFilters', () => {
  test('counts nothing for the defaults', () => {
    expect(countActiveFeedFilters(DEFAULT_FEED_FILTERS)).toBe(0);
  });

  test('counts each changed filter once', () => {
    expect(
      countActiveFeedFilters({
        scope: 'circles',
        types: ['loans'],
        distance: null,
        showOwnActivity: false,
        showClaimedGiveaways: false,
      }),
    ).toBe(5);
  });
});

describe('<FeedFilterSheet />', () => {
  test('renders nothing while hidden', () => {
    renderSheet({ visible: false });

    expect(screen.queryByTestId('filter-sheet')).toBeNull();
  });

  test('shows the defaults', async () => {
    renderSheet();

    expect(await screen.findByText(NO_LOCATION_HINT)).toBeTruthy();
    expect(screen.getByText('Filter activity')).toBeTruthy();
    expect(
      screen.getByRole('tab', { name: 'All activity' }).props.accessibilityState
        .selected,
    ).toBe(true);
    // No location: the server applies no distance, so no limit shows ticked.
    expect(checked('select-none')).toBe(true);
    expect(checked('select-20')).toBe(false);

    for (const type of TYPE_IDS) {
      expect(checked(`select-${type}`)).toBe(true);
    }

    expect(screen.getByLabelText('Show my own activity').props.value).toBe(
      true,
    );
    expect(screen.getByLabelText('Show given-away giveaways').props.value).toBe(
      true,
    );
  });

  test('disables distance without a location', async () => {
    const { onApply } = renderSheet();

    expect(await screen.findByText(NO_LOCATION_HINT)).toBeTruthy();

    for (const id of DISTANCE_IDS) {
      expect(
        screen.getByTestId(`select-${id}`).props.accessibilityState.disabled,
      ).toBe(true);
    }

    fireEvent.press(screen.getByTestId('select-5'));
    apply();

    expect(onApply).toHaveBeenCalledWith(DEFAULT_FEED_FILTERS);
  });

  test('applies no distance limit with a location', async () => {
    const { onApply } = renderSheet({ routes: withLocation });

    await waitForEnabled('select-none');
    expect(screen.queryByText(NO_LOCATION_HINT)).toBeNull();
    fireEvent.press(screen.getByTestId('select-none'));
    apply();

    expect(onApply).toHaveBeenCalledWith({
      ...DEFAULT_FEED_FILTERS,
      distance: null,
    });
  });

  test('applies a chosen distance with a location', async () => {
    const { onApply } = renderSheet({ routes: withLocation });

    await waitForEnabled('select-5');
    fireEvent.press(screen.getByTestId('select-5'));
    apply();

    expect(onApply).toHaveBeenCalledWith({
      ...DEFAULT_FEED_FILTERS,
      distance: 5,
    });
  });

  test('applies the circles scope', async () => {
    const { onApply } = renderSheet();

    await screen.findByText(NO_LOCATION_HINT);
    fireEvent.press(screen.getByText('My circles'));
    apply();

    expect(onApply).toHaveBeenCalledWith({
      ...DEFAULT_FEED_FILTERS,
      scope: 'circles',
    });
  });

  test('applies the remaining types', async () => {
    const { onApply } = renderSheet();

    await screen.findByText(NO_LOCATION_HINT);
    expect(screen.getByText('Pick at least one.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('select-requests'));
    apply();

    expect(onApply).toHaveBeenCalledWith({
      ...DEFAULT_FEED_FILTERS,
      types: ['giveaways', 'loans', 'circle_joins'],
    });
  });

  test('disables Apply with no types ticked', async () => {
    const { onApply } = renderSheet();

    await screen.findByText(NO_LOCATION_HINT);

    for (const type of TYPE_IDS) {
      fireEvent.press(screen.getByTestId(`select-${type}`));
    }

    expect(
      screen.getByTestId('filter-sheet-apply').props.accessibilityState
        .disabled,
    ).toBe(true);

    apply();

    expect(onApply).not.toHaveBeenCalled();
  });

  test('applies the switches', async () => {
    const { onApply } = renderSheet();

    await screen.findByText(NO_LOCATION_HINT);
    fireEvent(
      screen.getByLabelText('Show my own activity'),
      'valueChange',
      false,
    );
    fireEvent(
      screen.getByLabelText('Show given-away giveaways'),
      'valueChange',
      false,
    );

    expect(onApply).not.toHaveBeenCalled();

    apply();

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      ...DEFAULT_FEED_FILTERS,
      showOwnActivity: false,
      showClaimedGiveaways: false,
    });
  });

  test('reset returns the draft to the defaults', async () => {
    const { onApply } = renderSheet({
      filters: { ...DEFAULT_FEED_FILTERS, distance: 50 },
      routes: withLocation,
    });

    await waitForEnabled('select-none');
    fireEvent.press(screen.getByText('My circles'));
    fireEvent.press(screen.getByTestId('select-none'));
    fireEvent.press(screen.getByTestId('select-loans'));
    fireEvent(
      screen.getByLabelText('Show my own activity'),
      'valueChange',
      false,
    );

    expect(onApply).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('filter-sheet-reset'));

    expect(checked('select-20')).toBe(true);
    expect(checked('select-loans')).toBe(true);

    apply();

    expect(onApply).toHaveBeenCalledWith(DEFAULT_FEED_FILTERS);
  });
});
