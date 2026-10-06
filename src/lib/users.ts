import { readJsonOrThrow, type ApiFetch } from './api';
import {
  isNullableString,
  isObject,
  isString,
  matchEnum,
  normalizeImageUrl,
  parseArray,
} from './parse';
import { parseWebLink, type WebLink } from './profile';
import { parseCircleContext, type ConversationCircleContext } from './messages';

export const USER_PROFILE_ACCESS_REASONS = [
  'self',
  'admin',
  'circle',
  'conversation',
  'join_request',
] as const;

export type UserProfileAccessReason =
  (typeof USER_PROFILE_ACCESS_REASONS)[number];

export type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_image_url: string | null;
  about_me: string | null;
  web_links: WebLink[];
};

// Same shape the messaging endpoints already send for a conversation's circle
// context, so it's reused rather than redefined here.
export type SharedCircle = ConversationCircleContext;

export type UserProfileResponse = {
  user: UserProfile;
  shared_circles: SharedCircle[];
  access_reason: UserProfileAccessReason;
};

export type FetchUserProfileOptions = {
  signal?: AbortSignal;
};

const INVALID_USER_PROFILE = 'Invalid user profile payload.';

function parseUserProfileUser(value: unknown): UserProfile {
  if (!isObject(value)) {
    throw new Error(INVALID_USER_PROFILE);
  }

  const {
    about_me: aboutMe,
    first_name: firstName,
    full_name: fullName,
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
    !isNullableString(aboutMe)
  ) {
    throw new Error(INVALID_USER_PROFILE);
  }

  return {
    id,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    profile_image_url: normalizeImageUrl(profileImageUrl),
    about_me: aboutMe ?? null,
    web_links:
      webLinks === undefined
        ? []
        : parseArray(webLinks, INVALID_USER_PROFILE).map(parseWebLink),
  };
}

export function parseUserProfileResponse(value: unknown): UserProfileResponse {
  if (!isObject(value)) {
    throw new Error(INVALID_USER_PROFILE);
  }

  const {
    access_reason: accessReason,
    shared_circles: sharedCircles,
    user,
  } = value;

  const matchedAccessReason = matchEnum(
    isString(accessReason) ? accessReason : undefined,
    USER_PROFILE_ACCESS_REASONS,
  );

  if (matchedAccessReason === null) {
    throw new Error(INVALID_USER_PROFILE);
  }

  return {
    user: parseUserProfileUser(user),
    shared_circles:
      sharedCircles === undefined
        ? []
        : parseArray(sharedCircles, INVALID_USER_PROFILE).map((circle) =>
            parseCircleContext(circle, INVALID_USER_PROFILE),
          ),
    access_reason: matchedAccessReason,
  };
}

export async function fetchUserProfile(
  fetchImpl: ApiFetch,
  id: string,
  options?: FetchUserProfileOptions,
): Promise<UserProfileResponse> {
  const response = await fetchImpl(`/users/${encodeURIComponent(id)}`, {
    signal: options?.signal,
  });

  return parseUserProfileResponse(await readJsonOrThrow<unknown>(response));
}
