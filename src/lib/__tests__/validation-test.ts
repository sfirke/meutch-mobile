import { ApiError } from '../api';
import { describeError } from '../errorCopy';
import { buildGeneralMessage, readValidationErrors } from '../validation';

const FIELDS = ['name', 'size'] as const;

function validationError(details: Record<string, unknown> | null) {
  return new ApiError({
    code: 'VALIDATION_ERROR',
    message: 'Invalid',
    status: 422,
    details,
  });
}

describe('readValidationErrors', () => {
  test('splits known and unknown keys', () => {
    const result = readValidationErrors(
      validationError({ name: ['Too short.'], other: ['Bad other.'] }),
      FIELDS,
    );

    expect(result).toEqual({
      fields: { name: 'Too short.' },
      unknownFields: ['Bad other.'],
    });
  });

  test('accepts string messages, takes the first of an array, skips others', () => {
    const result = readValidationErrors(
      validationError({ name: 'Plain.', size: ['First.', 'Second.'], x: 5 }),
      FIELDS,
    );

    expect(result).toEqual({
      fields: { name: 'Plain.', size: 'First.' },
      unknownFields: [],
    });
  });

  test('returns empty results for non-ApiError input or missing details', () => {
    const empty = { fields: {}, unknownFields: [] };

    expect(readValidationErrors(new Error('x'), FIELDS)).toEqual(empty);
    expect(readValidationErrors(null, FIELDS)).toEqual(empty);
    expect(readValidationErrors(validationError(null), FIELDS)).toEqual(empty);
  });
});

describe('buildGeneralMessage', () => {
  test('is null without an error', () => {
    expect(
      buildGeneralMessage(null, { fields: {}, unknownFields: [] }),
    ).toBeNull();
  });

  test('joins unknown-field messages', () => {
    expect(
      buildGeneralMessage(new Error('x'), {
        fields: { name: 'Bad.' },
        unknownFields: ['One.', 'Two.'],
      }),
    ).toBe('One. Two.');
  });

  test('is null when only field messages exist', () => {
    expect(
      buildGeneralMessage(new Error('x'), {
        fields: { name: 'Bad.' },
        unknownFields: [],
      }),
    ).toBeNull();
  });

  test('falls back to the described error otherwise', () => {
    const error = new ApiError({
      code: 'SERVER_ERROR',
      message: 'Boom',
      status: 500,
    });

    expect(buildGeneralMessage(error, { fields: {}, unknownFields: [] })).toBe(
      describeError(error).message,
    );
  });
});
