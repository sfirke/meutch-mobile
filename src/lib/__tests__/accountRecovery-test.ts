import {
  getRequestBody,
  jsonResponse,
  mockApiFetch,
} from '../../test-utils/renderWithProviders';
import {
  RECOVERY_ERROR_OVERRIDES,
  requestPasswordReset,
  resendConfirmation,
} from '../accountRecovery';
import { ApiError } from '../api';
import { describeError } from '../errorCopy';

const EMAIL = 'member@example.com';

const cases = [
  {
    name: 'requestPasswordReset',
    run: requestPasswordReset,
    route: 'POST /auth/forgot-password',
    sendFailed: 'Unable to send password reset instructions right now.',
  },
  {
    name: 'resendConfirmation',
    run: resendConfirmation,
    route: 'POST /auth/resend-confirmation',
    sendFailed: 'Unable to send a confirmation email right now.',
  },
] as const;

function errorEnvelope(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
) {
  return jsonResponse({ error: { code, message, details } }, status);
}

describe.each(cases)('$name', ({ run, route, sendFailed }) => {
  it('posts the trimmed email and parses the message', async () => {
    const fetchImpl = mockApiFetch({
      [route]: { message: 'Check your inbox.' },
    });

    await expect(run(fetchImpl, `  ${EMAIL} `)).resolves.toEqual({
      message: 'Check your inbox.',
    });

    const [path, init] = fetchImpl.mock.calls[0];
    expect(`${init?.method} ${path}`).toBe(route);
    expect(getRequestBody(init)).toEqual({ email: EMAIL });
  });

  it('throws on a malformed payload', async () => {
    for (const body of [{}, { message: '' }, { message: 3 }, null]) {
      const fetchImpl = mockApiFetch({ [route]: body });

      await expect(run(fetchImpl, EMAIL)).rejects.toThrow(
        'Invalid recovery payload.',
      );
    }
  });

  it('rejects with validation details on 422', async () => {
    const fetchImpl = mockApiFetch({
      [route]: errorEnvelope('VALIDATION_ERROR', 'Validation failed.', 422, {
        email: ['Not a valid email address.'],
      }),
    });

    const error = await run(fetchImpl, 'nope').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).details).toEqual({
      email: ['Not a valid email address.'],
    });
  });

  it('describes a 429 as an hourly limit', async () => {
    const fetchImpl = mockApiFetch({
      [route]: errorEnvelope('RATE_LIMIT_EXCEEDED', 'Too many requests.', 429),
    });

    const error = await run(fetchImpl, EMAIL).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('RATE_LIMIT_EXCEEDED');
    expect(describeError(error, RECOVERY_ERROR_OVERRIDES).message).toContain(
      'hour',
    );
  });

  it('shows the backend message on a 503 and allows retry', async () => {
    const fetchImpl = mockApiFetch({
      [route]: errorEnvelope('EMAIL_SEND_FAILED', sendFailed, 503),
    });

    const error = await run(fetchImpl, EMAIL).catch((e: unknown) => e);

    expect(describeError(error, RECOVERY_ERROR_OVERRIDES)).toMatchObject({
      message: sendFailed,
      canRetry: true,
    });
  });
});
