import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import type { ApiFetch } from '../../lib/api';
import MockFontAwesome6 from '../../test-utils/mockFontAwesome6';
import {
  defaultSettingsFixture,
  getRequestBody,
  jsonResponse,
  mockApiFetch,
  mockSession,
  renderWithProviders,
} from '../../test-utils/renderWithProviders';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('../../session/SessionProvider', () => ({ useSession: jest.fn() }));

jest.mock('expo-router', () => ({ Stack: { Screen: jest.fn(() => null) } }));

jest.mock('@expo/vector-icons/FontAwesome6', () => MockFontAwesome6);

type SettingsFixture = typeof defaultSettingsFixture;

function buildSettings(overrides?: Partial<SettingsFixture>): SettingsFixture {
  return { ...defaultSettingsFixture, ...overrides };
}

function settingsRoute(overrides?: Partial<SettingsFixture>) {
  return { settings: buildSettings(overrides) };
}

function renderSettingsScreen(authenticatedApiFetch: ApiFetch) {
  mockSession({ authenticatedApiFetch });

  return renderWithProviders(<SettingsScreen />);
}

function saveButton() {
  return screen.getByRole('button', { name: 'Save' });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('settings screen', () => {
  test('shows a loading indicator while the settings load', async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    const authenticatedApiFetch = jest.fn(
      async () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as unknown as ApiFetch;

    renderSettingsScreen(authenticatedApiFetch);

    expect(await screen.findByLabelText('Loading settings')).toBeTruthy();

    resolveFetch(jsonResponse(settingsRoute()));
    await waitFor(() =>
      expect(screen.queryByLabelText('Loading settings')).toBeNull(),
    );
  });

  test('renders the loaded settings and the header note', async () => {
    renderSettingsScreen(mockApiFetch({ 'GET /me/settings': settingsRoute() }));

    expect(
      await screen.findByText(
        'Digest emails are sent by meutch.com; these settings apply to your account everywhere.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Vacation mode').props.value).toBe(false);
    expect(screen.getByRole('tab', { name: 'Weekly' })).toBeSelected();
    expect(screen.getByLabelText('Digest radius in miles').props.value).toBe(
      '10',
    );
    expect(screen.getByLabelText('Giveaways').props.value).toBe(true);
    expect(screen.getByLabelText('Circle joins').props.value).toBe(true);
    expect(
      within(screen.getByTestId('digest-giveaway-sources')).getByRole('tab', {
        name: 'Circles only',
      }),
    ).toBeSelected();
    expect(
      within(screen.getByTestId('digest-request-sources')).getByRole('tab', {
        name: 'Circles only',
      }),
    ).toBeSelected();
  });

  test('shows error copy and reloads the settings on retry', async () => {
    const authenticatedApiFetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: "You're doing that a bit too fast.",
            },
          },
          429,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(settingsRoute()),
      ) as unknown as jest.MockedFunction<ApiFetch>;

    renderSettingsScreen(authenticatedApiFetch);

    expect(await screen.findByText('Slow down')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByLabelText('Vacation mode')).toBeTruthy();
    expect(authenticatedApiFetch).toHaveBeenCalledTimes(2);
  });

  test('enables Save only once a field changes', async () => {
    renderSettingsScreen(mockApiFetch({ 'GET /me/settings': settingsRoute() }));

    expect(await screen.findByLabelText('Vacation mode')).toBeTruthy();
    expect(saveButton()).toBeDisabled();

    fireEvent(screen.getByLabelText('Vacation mode'), 'valueChange', true);

    expect(saveButton()).not.toBeDisabled();
  });

  test('disables the digest sub-fields when the frequency is None', async () => {
    renderSettingsScreen(
      mockApiFetch({
        'GET /me/settings': settingsRoute({ digest_frequency: 'none' }),
      }),
    );

    expect(
      (await screen.findByLabelText('Digest radius in miles')).props.editable,
    ).toBe(false);
    expect(screen.getByLabelText('Giveaways')).toBeDisabled();
    expect(screen.getByLabelText('Requests')).toBeDisabled();
    expect(screen.getByLabelText('Circle joins')).toBeDisabled();
    expect(screen.getByLabelText('Loans')).toBeDisabled();
    expect(screen.getByTestId('digest-giveaway-sources')).toBeDisabled();
    expect(screen.getByTestId('digest-request-sources')).toBeDisabled();
  });

  test('re-enables the digest sub-fields when a frequency is chosen', async () => {
    renderSettingsScreen(
      mockApiFetch({
        'GET /me/settings': settingsRoute({ digest_frequency: 'none' }),
      }),
    );

    fireEvent.press(await screen.findByRole('tab', { name: 'Daily' }));

    expect(screen.getByLabelText('Digest radius in miles').props.editable).toBe(
      true,
    );
    expect(screen.getByLabelText('Giveaways')).toBeEnabled();
    expect(screen.getByTestId('digest-giveaway-sources')).toBeEnabled();
    expect(screen.getByTestId('digest-request-sources')).toBeEnabled();
  });

  test('saves every field, confirms, and goes clean again', async () => {
    let patchBody: unknown;
    const saved = buildSettings({
      vacation_mode: true,
      digest_radius_miles: 25,
      digest_requests_include_public: true,
    });
    const authenticatedApiFetch = mockApiFetch({
      'GET /me/settings': settingsRoute(),
      'PATCH /me/settings': (init?: RequestInit) => {
        patchBody = getRequestBody(init);

        return { settings: saved };
      },
    });

    renderSettingsScreen(authenticatedApiFetch);

    fireEvent(
      await screen.findByLabelText('Vacation mode'),
      'valueChange',
      true,
    );
    fireEvent.changeText(screen.getByLabelText('Digest radius in miles'), '25');
    fireEvent.press(
      within(screen.getByTestId('digest-request-sources')).getByRole('tab', {
        name: 'Include public nearby',
      }),
    );
    fireEvent.press(saveButton());

    expect(await screen.findByTestId('settings-feedback')).toHaveTextContent(
      'Saved',
    );
    expect(patchBody).toEqual({
      vacation_mode: true,
      digest_frequency: 'weekly',
      digest_radius_miles: 25,
      digest_include_giveaways: true,
      digest_include_requests: true,
      digest_include_circle_joins: true,
      digest_include_loans: true,
      digest_giveaways_include_public: false,
      digest_requests_include_public: true,
    });
    expect(saveButton()).toBeDisabled();
  });

  test('relabels Save while the settings write is in flight', async () => {
    let resolvePatch: (response: Response) => void = () => undefined;
    const authenticatedApiFetch = jest.fn(
      async (_path: string, init?: RequestInit) => {
        if ((init?.method ?? 'GET') !== 'GET') {
          return new Promise<Response>((resolve) => {
            resolvePatch = resolve;
          });
        }

        return jsonResponse(settingsRoute());
      },
    ) as unknown as ApiFetch;

    renderSettingsScreen(authenticatedApiFetch);

    fireEvent(
      await screen.findByLabelText('Vacation mode'),
      'valueChange',
      true,
    );
    fireEvent.press(saveButton());

    expect(
      await screen.findByRole('button', { name: 'Saving...' }),
    ).toBeDisabled();

    resolvePatch(jsonResponse(settingsRoute({ vacation_mode: true })));

    expect(await screen.findByTestId('settings-feedback')).toHaveTextContent(
      'Saved',
    );
  });

  test('renders a 422 field message next to the radius input', async () => {
    renderSettingsScreen(
      mockApiFetch({
        'GET /me/settings': settingsRoute(),
        'PATCH /me/settings': jsonResponse(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input.',
              details: { digest_radius_miles: ['Must be between 1 and 50.'] },
            },
          },
          422,
        ),
      }),
    );

    fireEvent(
      await screen.findByLabelText('Vacation mode'),
      'valueChange',
      true,
    );
    fireEvent.press(saveButton());

    expect(
      await screen.findByTestId('field-error-digest_radius_miles'),
    ).toHaveTextContent('Must be between 1 and 50.');
    expect(screen.queryByTestId('settings-error')).toBeNull();
  });

  test('shows maintenance copy and stays dirty when writes are disabled', async () => {
    renderSettingsScreen(
      mockApiFetch({
        'GET /me/settings': settingsRoute(),
        'PATCH /me/settings': jsonResponse(
          {
            error: { code: 'API_READ_ONLY', message: 'Writes are disabled.' },
          },
          503,
        ),
      }),
    );

    fireEvent(
      await screen.findByLabelText('Vacation mode'),
      'valueChange',
      true,
    );
    fireEvent.press(saveButton());

    expect(await screen.findByTestId('settings-error')).toHaveTextContent(
      "We're doing some maintenance. Please try again soon.",
    );
    expect(screen.queryByTestId('settings-feedback')).toBeNull();
    expect(saveButton()).not.toBeDisabled();
  });
});
