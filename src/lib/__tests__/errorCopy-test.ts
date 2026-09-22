import { ApiError } from '../api';
import { describeError } from '../errorCopy';
import { SessionExpiredError, SessionRequiredError } from '../session';

function apiError(code: string, message: string, status: number): ApiError {
  return new ApiError({ code, message, status });
}

describe('describeError', () => {
  test('maps RATE_LIMIT_EXCEEDED to retryable slow-down copy', () => {
    const result = describeError(
      apiError('RATE_LIMIT_EXCEEDED', 'Too many requests.', 429),
    );

    expect(result.canRetry).toBe(true);
    expect(result.title).toBeTruthy();
    expect(result.message).toBeTruthy();
  });

  test('maps FORBIDDEN to non-retryable no-access copy', () => {
    const result = describeError(apiError('FORBIDDEN', 'No access.', 403));

    expect(result.canRetry).toBe(false);
  });

  test('maps NOT_FOUND to non-retryable not-found copy', () => {
    const result = describeError(apiError('NOT_FOUND', 'Missing.', 404));

    expect(result.canRetry).toBe(false);
  });

  test('maps API_READ_ONLY to retryable maintenance copy', () => {
    const result = describeError(apiError('API_READ_ONLY', 'Read only.', 503));

    expect(result.canRetry).toBe(true);
    expect(result.title).toMatch(/unavailable/i);
  });

  test('maps API_DISABLED to retryable maintenance copy', () => {
    const result = describeError(apiError('API_DISABLED', 'Disabled.', 503));

    expect(result.canRetry).toBe(true);
    expect(result.title).toMatch(/unavailable/i);
  });

  test('maps a TypeError to retryable offline copy', () => {
    const result = describeError(new TypeError('Network request failed'));

    expect(result.canRetry).toBe(true);
    expect(result.title).toMatch(/offline/i);
  });

  test('maps SessionExpiredError to non-retryable sign-in-again copy', () => {
    const result = describeError(new SessionExpiredError());

    expect(result.canRetry).toBe(false);
    expect(result.message).toMatch(/session/i);
  });

  test('maps SessionRequiredError to non-retryable sign-in-again copy', () => {
    const result = describeError(new SessionRequiredError());

    expect(result.canRetry).toBe(false);
    expect(result.message).toMatch(/session/i);
  });

  test('shows the backend message for an unrecognised ApiError code', () => {
    const result = describeError(
      apiError('SOMETHING_NEW', 'A backend-provided explanation.', 500),
    );

    expect(result.canRetry).toBe(true);
    expect(result.message).toBe('A backend-provided explanation.');
  });

  test('maps INVALID_ACTION to non-retryable copy with the backend message', () => {
    const result = describeError(
      apiError('INVALID_ACTION', 'You already belong to this circle.', 400),
    );

    expect(result.canRetry).toBe(false);
    expect(result.message).toBe('You already belong to this circle.');
    expect(result.title).toBeTruthy();
  });

  test('falls back to generic copy when INVALID_ACTION has no backend message', () => {
    const result = describeError(apiError('INVALID_ACTION', '', 400));

    expect(result.canRetry).toBe(false);
    expect(result.message).toBeTruthy();
  });

  test('maps CONFLICT to non-retryable copy with the backend message', () => {
    const result = describeError(
      apiError('CONFLICT', 'You already requested to join.', 409),
    );

    expect(result.canRetry).toBe(false);
    expect(result.message).toBe('You already requested to join.');
  });

  test('falls back to generic copy when CONFLICT has no backend message', () => {
    const result = describeError(apiError('CONFLICT', '', 409));

    expect(result.canRetry).toBe(false);
    expect(result.message).toBeTruthy();
  });

  test('maps VALIDATION_ERROR to non-retryable copy with the backend message', () => {
    const result = describeError(
      apiError('VALIDATION_ERROR', 'Invalid input.', 422),
    );

    expect(result.canRetry).toBe(false);
    expect(result.message).toBe('Invalid input.');
    expect(result.title).toMatch(/input/i);
  });

  test('falls back to generic copy when VALIDATION_ERROR has no backend message', () => {
    const result = describeError(apiError('VALIDATION_ERROR', '', 422));

    expect(result.canRetry).toBe(false);
    expect(result.message).toBeTruthy();
  });

  test('applies an override to INVALID_ACTION', () => {
    const result = describeError(
      apiError('INVALID_ACTION', 'You already belong to this circle.', 400),
      { INVALID_ACTION: { title: 'Already a member' } },
    );

    expect(result.title).toBe('Already a member');
  });

  test('never surfaces a raw non-ApiError message', () => {
    const result = describeError(new Error('stack trace leak: /internal/db'));

    expect(result.canRetry).toBe(true);
    expect(result.message).not.toContain('/internal/db');
  });

  test('falls back to generic copy for a completely unknown throwable', () => {
    const result = describeError('plain string throw');

    expect(result.canRetry).toBe(true);
    expect(result.title).toBeTruthy();
  });

  test('applies a per-code override', () => {
    const result = describeError(apiError('NOT_FOUND', 'Missing.', 404), {
      NOT_FOUND: { title: 'This item is gone', message: 'It was removed.' },
    });

    expect(result.title).toBe('This item is gone');
    expect(result.message).toBe('It was removed.');
    expect(result.canRetry).toBe(false);
  });

  test('applies an offline override', () => {
    const result = describeError(new TypeError('Network request failed'), {
      OFFLINE: { title: 'No connection' },
    });

    expect(result.title).toBe('No connection');
  });

  test('leaves other codes untouched when only one code is overridden', () => {
    const result = describeError(apiError('FORBIDDEN', 'No access.', 403), {
      NOT_FOUND: { title: 'This item is gone' },
    });

    expect(result.title).not.toBe('This item is gone');
  });
});
