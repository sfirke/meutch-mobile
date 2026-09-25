import { buildJsonRequestInit, readJsonOrThrow, type ApiFetch } from './api';
import {
  isNullableString,
  isNumber,
  isObject,
  isString,
  matchEnum,
  normalizeImageUrl,
  parseArray,
} from './parse';

export const DIGEST_FREQUENCIES = ['none', 'daily', 'weekly'] as const;

export type DigestFrequency = (typeof DIGEST_FREQUENCIES)[number];

export type WebLink = {
  id: string;
  platform_type: string;
  platform_name: string | null;
  display_name: string;
  url: string;
  display_order: number;
};

export type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_image_url: string | null;
  email: string;
  email_confirmed: boolean;
  about_me: string | null;
  created_at: string;
  has_location: boolean;
  geocoding_failed: boolean;
  web_links: WebLink[];
};

export type UserSettings = {
  vacation_mode: boolean;
  digest_frequency: DigestFrequency;
  digest_radius_miles: number;
  digest_include_giveaways: boolean;
  digest_include_requests: boolean;
  digest_include_circle_joins: boolean;
  digest_include_loans: boolean;
  digest_giveaways_include_public: boolean;
  digest_requests_include_public: boolean;
};

export type FetchProfileOptions = {
  signal?: AbortSignal;
};

export type FetchSettingsOptions = {
  signal?: AbortSignal;
};

const INVALID_WEB_LINK = 'Invalid web link payload.';
const INVALID_PROFILE = 'Invalid profile payload.';
const INVALID_SETTINGS = 'Invalid settings payload.';

export function parseWebLink(value: unknown): WebLink {
  if (!isObject(value)) {
    throw new Error(INVALID_WEB_LINK);
  }

  const {
    display_name: displayName,
    display_order: displayOrder,
    id,
    platform_name: platformName,
    platform_type: platformType,
    url,
  } = value;

  if (
    !isString(id) ||
    !isString(platformType) ||
    !isNullableString(platformName) ||
    !isString(displayName) ||
    !isString(url) ||
    !isNumber(displayOrder)
  ) {
    throw new Error(INVALID_WEB_LINK);
  }

  return {
    id,
    platform_type: platformType,
    platform_name: platformName ?? null,
    display_name: displayName,
    url,
    display_order: displayOrder,
  };
}

export function parseUserProfile(value: unknown): UserProfile {
  if (!isObject(value)) {
    throw new Error(INVALID_PROFILE);
  }

  const {
    about_me: aboutMe,
    created_at: createdAt,
    email,
    email_confirmed: emailConfirmed,
    first_name: firstName,
    full_name: fullName,
    geocoding_failed: geocodingFailed,
    has_location: hasLocation,
    id,
    last_name: lastName,
    profile_image_url: profileImageUrl,
    web_links: webLinks,
  } = value;

  if (
    !isString(id) ||
    !isString(firstName) ||
    !isString(lastName) ||
    !isString(fullName) ||
    !isNullableString(profileImageUrl) ||
    !isString(email) ||
    typeof emailConfirmed !== 'boolean' ||
    !isNullableString(aboutMe) ||
    !isString(createdAt) ||
    typeof hasLocation !== 'boolean' ||
    typeof geocodingFailed !== 'boolean'
  ) {
    throw new Error(INVALID_PROFILE);
  }

  return {
    id,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    profile_image_url: normalizeImageUrl(profileImageUrl),
    email,
    email_confirmed: emailConfirmed,
    about_me: aboutMe ?? null,
    created_at: createdAt,
    has_location: hasLocation,
    geocoding_failed: geocodingFailed,
    web_links: parseArray(webLinks, INVALID_PROFILE).map(parseWebLink),
  };
}

export function parseUserSettings(value: unknown): UserSettings {
  if (!isObject(value)) {
    throw new Error(INVALID_SETTINGS);
  }

  const {
    digest_frequency: digestFrequency,
    digest_giveaways_include_public: digestGiveawaysIncludePublic,
    digest_include_circle_joins: digestIncludeCircleJoins,
    digest_include_giveaways: digestIncludeGiveaways,
    digest_include_loans: digestIncludeLoans,
    digest_include_requests: digestIncludeRequests,
    digest_radius_miles: digestRadiusMiles,
    digest_requests_include_public: digestRequestsIncludePublic,
    vacation_mode: vacationMode,
  } = value;

  // The settings form cannot render an unknown frequency, so reject it here
  // rather than falling back to a default like the nullable enums elsewhere.
  const matchedFrequency = matchEnum(
    isString(digestFrequency) ? digestFrequency : undefined,
    DIGEST_FREQUENCIES,
  );

  if (
    typeof vacationMode !== 'boolean' ||
    matchedFrequency === null ||
    !isNumber(digestRadiusMiles) ||
    typeof digestIncludeGiveaways !== 'boolean' ||
    typeof digestIncludeRequests !== 'boolean' ||
    typeof digestIncludeCircleJoins !== 'boolean' ||
    typeof digestIncludeLoans !== 'boolean' ||
    typeof digestGiveawaysIncludePublic !== 'boolean' ||
    typeof digestRequestsIncludePublic !== 'boolean'
  ) {
    throw new Error(INVALID_SETTINGS);
  }

  return {
    vacation_mode: vacationMode,
    digest_frequency: matchedFrequency,
    digest_radius_miles: digestRadiusMiles,
    digest_include_giveaways: digestIncludeGiveaways,
    digest_include_requests: digestIncludeRequests,
    digest_include_circle_joins: digestIncludeCircleJoins,
    digest_include_loans: digestIncludeLoans,
    digest_giveaways_include_public: digestGiveawaysIncludePublic,
    digest_requests_include_public: digestRequestsIncludePublic,
  };
}

export async function fetchProfile(
  fetchImpl: ApiFetch,
  options?: FetchProfileOptions,
): Promise<UserProfile> {
  const response = await fetchImpl('/me/profile', { signal: options?.signal });
  const payload = await readJsonOrThrow<{ user: unknown }>(response);

  return parseUserProfile(payload.user);
}

export async function updateAboutMe(
  fetchImpl: ApiFetch,
  aboutMe: string,
): Promise<UserProfile> {
  const response = await fetchImpl(
    '/me/profile',
    buildJsonRequestInit({ about_me: aboutMe }, { method: 'PATCH' }),
  );
  const payload = await readJsonOrThrow<{
    user: unknown;
    image_upload_failed: boolean;
  }>(response);

  return parseUserProfile(payload.user);
}

export async function fetchSettings(
  fetchImpl: ApiFetch,
  options?: FetchSettingsOptions,
): Promise<UserSettings> {
  const response = await fetchImpl('/me/settings', {
    signal: options?.signal,
  });
  const payload = await readJsonOrThrow<{ settings: unknown }>(response);

  return parseUserSettings(payload.settings);
}

export async function updateSettings(
  fetchImpl: ApiFetch,
  settings: UserSettings,
): Promise<UserSettings> {
  const response = await fetchImpl(
    '/me/settings',
    buildJsonRequestInit(settings, { method: 'PATCH' }),
  );
  const payload = await readJsonOrThrow<{ settings: unknown }>(response);

  return parseUserSettings(payload.settings);
}
