import { buildJsonRequestInit, readJsonOrThrow, type ApiFetch } from './api';
import { isObject, matchEnum } from './parse';

export const LOCATION_STATUSES = [
  'success',
  'removed',
  'rate_limited',
  'geocoding_failed',
  'geocoding_error',
  'unexpected_error',
] as const;

export type LocationStatus = (typeof LOCATION_STATUSES)[number];

export const ADDRESS_FIELDS = [
  'street',
  'city',
  'state',
  'zip_code',
  'country',
] as const;

export type AddressField = (typeof ADDRESS_FIELDS)[number];

export const ADDRESS_FIELD_LABELS: Record<AddressField, string> = {
  street: 'Street address',
  city: 'City',
  state: 'State or region',
  zip_code: 'Postal code',
  country: 'Country',
};

export type AddressInput = Record<AddressField, string>;

export type LocationUpdateResult = {
  status: LocationStatus;
  user: { has_location: boolean; geocoding_failed: boolean };
};

export type LocationResultTone = 'success' | 'warning' | 'error';

// Geocoding is synchronous on the backend and can be slow.
export const LOCATION_REQUEST_TIMEOUT_MS = 60_000;

const INVALID_LOCATION = 'Invalid location payload.';

export function parseLocationUpdateResult(
  value: unknown,
): LocationUpdateResult {
  if (!isObject(value) || !isObject(value.user)) {
    throw new Error(INVALID_LOCATION);
  }

  const status = matchEnum(
    typeof value.status === 'string' ? value.status : null,
    LOCATION_STATUSES,
  );
  const { has_location: hasLocation, geocoding_failed: geocodingFailed } =
    value.user;

  if (
    status === null ||
    typeof hasLocation !== 'boolean' ||
    typeof geocodingFailed !== 'boolean'
  ) {
    throw new Error(INVALID_LOCATION);
  }

  return {
    status,
    user: { has_location: hasLocation, geocoding_failed: geocodingFailed },
  };
}

async function patchLocation(
  fetchImpl: ApiFetch,
  body: Record<string, string>,
): Promise<LocationUpdateResult> {
  const response = await fetchImpl(
    '/me/location',
    buildJsonRequestInit(body, {
      method: 'PATCH',
      timeoutMs: LOCATION_REQUEST_TIMEOUT_MS,
    }),
  );

  return parseLocationUpdateResult(await readJsonOrThrow<unknown>(response));
}

export function updateLocationByAddress(
  fetchImpl: ApiFetch,
  address: AddressInput,
): Promise<LocationUpdateResult> {
  return patchLocation(fetchImpl, {
    location_method: 'address',
    street: address.street.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    zip_code: address.zip_code.trim(),
    country: address.country.trim(),
  });
}

export function removeLocation(
  fetchImpl: ApiFetch,
): Promise<LocationUpdateResult> {
  return patchLocation(fetchImpl, { location_method: 'remove' });
}

const RESULT_COPY: Record<
  LocationStatus,
  { tone: LocationResultTone; message: string }
> = {
  success: { tone: 'success', message: 'Your location has been updated.' },
  removed: { tone: 'success', message: 'Your location has been removed.' },
  rate_limited: {
    tone: 'warning',
    message:
      'You can only update your location once per day. Please try again tomorrow.',
  },
  geocoding_failed: {
    tone: 'warning',
    message:
      "We couldn't determine your location from that address. Check the address and try again.",
  },
  geocoding_error: {
    tone: 'warning',
    message:
      'There was an error determining your location from that address. Please try again later.',
  },
  unexpected_error: {
    tone: 'error',
    message:
      'There was an error determining your location. Please try again later.',
  },
};

export function describeLocationResult(status: LocationStatus): {
  tone: LocationResultTone;
  message: string;
} {
  return RESULT_COPY[status];
}
