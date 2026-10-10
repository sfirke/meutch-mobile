import { isApiError } from './api';
import { describeError, type ErrorCopyOverrides } from './errorCopy';

export type ValidationErrors<Field extends string> = {
  fields: Partial<Record<Field, string>>;
  /** Messages for keys the form has no field for, e.g. a schema-level error. */
  unknownFields: string[];
};

function readFirstMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return null;
}

/** Splits a 422's `details` into per-field copy and anything unrecognised. */
export function readValidationErrors<Field extends string>(
  error: unknown,
  knownFields: readonly Field[],
): ValidationErrors<Field> {
  const fields: Partial<Record<Field, string>> = {};
  const unknownFields: string[] = [];

  if (!isApiError(error) || !error.details) {
    return { fields, unknownFields };
  }

  for (const [key, value] of Object.entries(error.details)) {
    const message = readFirstMessage(value);

    if (!message) {
      continue;
    }

    if ((knownFields as readonly string[]).includes(key)) {
      fields[key as Field] = message;
    } else {
      unknownFields.push(message);
    }
  }

  return { fields, unknownFields };
}

export function buildGeneralMessage(
  error: unknown,
  validation: ValidationErrors<string>,
  overrides?: ErrorCopyOverrides,
): string | null {
  if (!error) {
    return null;
  }

  if (validation.unknownFields.length > 0) {
    return validation.unknownFields.join(' ');
  }

  // Field messages are already rendered beside their inputs.
  if (Object.keys(validation.fields).length > 0) {
    return null;
  }

  return describeError(error, overrides).message;
}
