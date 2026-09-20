import * as SecureStore from 'expo-secure-store';

import type { TokenBundle } from './session';

const SESSION_STORAGE_KEY = 'meutch.mobile.session';

// Refresh tokens live for 30 days, so the bundle must not ride an encrypted
// device backup onto different hardware. The SecureStore default of
// WHEN_UNLOCKED migrates keychain entries on a backup restore;
// WHEN_UNLOCKED_THIS_DEVICE_ONLY keeps them on the device that issued them.
const SESSION_STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export type SessionStorage = {
  load: () => Promise<TokenBundle | null>;
  save: (session: TokenBundle) => Promise<void>;
  clear: () => Promise<void>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseUser(value: unknown): TokenBundle['user'] | null {
  if (!isObject(value)) {
    return null;
  }

  const {
    email,
    email_confirmed: emailConfirmed,
    first_name: firstName,
    full_name: fullName,
    id,
    last_name: lastName,
    profile_image_url: profileImageUrl,
  } = value;

  if (
    !isString(id) ||
    !isString(email) ||
    typeof emailConfirmed !== 'boolean' ||
    !isString(firstName) ||
    !isString(lastName) ||
    !isString(fullName) ||
    !(profileImageUrl === null || typeof profileImageUrl === 'string')
  ) {
    return null;
  }

  return {
    id,
    email,
    email_confirmed: emailConfirmed,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    profile_image_url: profileImageUrl,
  };
}

function parseSession(value: unknown): TokenBundle | null {
  if (!isObject(value)) {
    return null;
  }

  const {
    access_token: accessToken,
    access_token_expires_at: accessTokenExpiresAt,
    refresh_token: refreshToken,
    refresh_token_expires_at: refreshTokenExpiresAt,
    token_type: tokenType,
    user,
  } = value;

  const parsedUser = parseUser(user);

  if (
    !isString(accessToken) ||
    !isString(refreshToken) ||
    !isString(accessTokenExpiresAt) ||
    !isString(refreshTokenExpiresAt) ||
    tokenType !== 'Bearer' ||
    parsedUser === null
  ) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    access_token_expires_at: accessTokenExpiresAt,
    refresh_token_expires_at: refreshTokenExpiresAt,
    user: parsedUser,
  };
}

export const secureSessionStorage: SessionStorage = {
  async load() {
    const storedValue = await SecureStore.getItemAsync(
      SESSION_STORAGE_KEY,
      SESSION_STORAGE_OPTIONS,
    );

    if (!storedValue) {
      return null;
    }

    try {
      return parseSession(JSON.parse(storedValue));
    } catch {
      return null;
    }
  },

  async save(session) {
    await SecureStore.setItemAsync(
      SESSION_STORAGE_KEY,
      JSON.stringify(session),
      SESSION_STORAGE_OPTIONS,
    );
  },

  async clear() {
    await SecureStore.deleteItemAsync(
      SESSION_STORAGE_KEY,
      SESSION_STORAGE_OPTIONS,
    );
  },
};
