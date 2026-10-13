import { buildJsonRequestInit, readJsonOrThrow, type ApiFetch } from './api';
import type { ErrorCopyOverrides } from './errorCopy';
import { isObject, isString } from './parse';

export type RecoveryResult = { message: string };

/** For recovery screens: `describeError(error, RECOVERY_ERROR_OVERRIDES)`. */
export const RECOVERY_ERROR_OVERRIDES: ErrorCopyOverrides = {
  RATE_LIMIT_EXCEEDED: {
    title: 'Slow down',
    message:
      "You've asked for this email too many times. Try again in an hour.",
  },
};

function parseRecoveryResult(value: unknown): RecoveryResult {
  if (!isObject(value) || !isString(value.message) || !value.message) {
    throw new Error('Invalid recovery payload.');
  }

  return { message: value.message };
}

async function postRecovery(
  fetchImpl: ApiFetch,
  path: string,
  email: string,
): Promise<RecoveryResult> {
  const response = await fetchImpl(
    path,
    buildJsonRequestInit({ email: email.trim() }, { method: 'POST' }),
  );

  return parseRecoveryResult(await readJsonOrThrow<unknown>(response));
}

export function requestPasswordReset(
  fetchImpl: ApiFetch,
  email: string,
): Promise<RecoveryResult> {
  return postRecovery(fetchImpl, '/auth/forgot-password', email);
}

export function resendConfirmation(
  fetchImpl: ApiFetch,
  email: string,
): Promise<RecoveryResult> {
  return postRecovery(fetchImpl, '/auth/resend-confirmation', email);
}
