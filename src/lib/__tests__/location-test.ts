import { isApiError } from '../api';
import {
  LOCATION_REQUEST_TIMEOUT_MS,
  LOCATION_STATUSES,
  describeLocationResult,
  parseLocationUpdateResult,
  removeLocation,
  updateLocationByAddress,
  type LocationStatus,
} from '../location';
import {
  getRequestBody,
  jsonResponse,
  mockApiFetch,
} from '../../test-utils/renderWithProviders';

const address = {
  street: '  1 Example Street ',
  city: ' Springfield',
  state: 'Example State  ',
  zip_code: ' 00000 ',
  country: 'Example Country',
};

function resultPayload(status: string, hasLocation = true) {
  return {
    status,
    user: { has_location: hasLocation, geocoding_failed: false },
  };
}

describe('updateLocationByAddress', () => {
  test('sends a trimmed PATCH with the long timeout', async () => {
    const fetchImpl = mockApiFetch({
      'PATCH /me/location': resultPayload('success'),
    });

    const result = await updateLocationByAddress(fetchImpl, address);

    const [path, init] = fetchImpl.mock.calls[0];
    expect(path).toBe('/me/location');
    expect(init?.method).toBe('PATCH');
    expect((init as { timeoutMs?: number }).timeoutMs).toBe(60000);
    expect(LOCATION_REQUEST_TIMEOUT_MS).toBe(60000);
    expect(getRequestBody(init)).toEqual({
      location_method: 'address',
      street: '1 Example Street',
      city: 'Springfield',
      state: 'Example State',
      zip_code: '00000',
      country: 'Example Country',
    });
    expect(result).toEqual(resultPayload('success'));
  });

  test('rejects a 422 with field details', async () => {
    const fetchImpl = mockApiFetch({
      'PATCH /me/location': jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed.',
            details: { street: ['This field is required.'] },
          },
        },
        422,
      ),
    });

    const error = await updateLocationByAddress(fetchImpl, address).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.details?.street).toBeDefined();
  });
});

describe('removeLocation', () => {
  test('sends the remove method with the long timeout', async () => {
    const fetchImpl = mockApiFetch({
      'PATCH /me/location': resultPayload('removed', false),
    });

    const result = await removeLocation(fetchImpl);

    const [, init] = fetchImpl.mock.calls[0];
    expect(getRequestBody(init)).toEqual({ location_method: 'remove' });
    expect((init as { timeoutMs?: number }).timeoutMs).toBe(60000);
    expect(result.status).toBe('removed');
    expect(result.user.has_location).toBe(false);
  });
});

describe('parseLocationUpdateResult', () => {
  test.each(LOCATION_STATUSES)('parses status %s', (status) => {
    expect(parseLocationUpdateResult(resultPayload(status))).toEqual(
      resultPayload(status),
    );
  });

  test('rejects an unknown status', () => {
    expect(() => parseLocationUpdateResult(resultPayload('bogus'))).toThrow(
      'Invalid location payload.',
    );
  });

  test('rejects a missing user', () => {
    expect(() => parseLocationUpdateResult({ status: 'success' })).toThrow(
      'Invalid location payload.',
    );
  });

  test('rejects a non-object', () => {
    expect(() => parseLocationUpdateResult(null)).toThrow(
      'Invalid location payload.',
    );
  });
});

describe('describeLocationResult', () => {
  const expected: Record<LocationStatus, [string, string]> = {
    success: ['success', 'Your location has been updated.'],
    removed: ['success', 'Your location has been removed.'],
    rate_limited: [
      'warning',
      'You can only update your location once per day. Please try again tomorrow.',
    ],
    geocoding_failed: [
      'warning',
      "We couldn't determine your location from that address. Check the address and try again.",
    ],
    geocoding_error: [
      'warning',
      'There was an error determining your location from that address. Please try again later.',
    ],
    unexpected_error: [
      'error',
      'There was an error determining your location. Please try again later.',
    ],
  };

  test.each(LOCATION_STATUSES)('describes %s', (status) => {
    const [tone, message] = expected[status];
    expect(describeLocationResult(status)).toEqual({ tone, message });
  });
});
