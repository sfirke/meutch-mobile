import { isNullableString, isObject, isString, matchEnum } from './parse';

// Kept apart from loans.ts so messages.ts can parse these without a require cycle.

export const LOAN_EXTENSION_STATUSES = [
  'pending',
  'approved',
  'denied',
  'canceled',
] as const;

export type LoanExtensionStatus = (typeof LOAN_EXTENSION_STATUSES)[number];

/** A borrower's request to move the due date, with the owner's decision. */
export type LoanExtensionRequest = {
  id: string;
  status: LoanExtensionStatus | null;
  /** `YYYY-MM-DD`, like the loan dates. */
  previous_end_date: string;
  proposed_end_date: string;
  message: string;
  created_at: string;
  responded_at: string | null;
};

export function parseLoanExtensionRequest(
  value: unknown,
  message: string,
): LoanExtensionRequest {
  if (!isObject(value)) {
    throw new Error(message);
  }

  const {
    created_at: createdAt,
    id,
    message: body,
    previous_end_date: previousEndDate,
    proposed_end_date: proposedEndDate,
    responded_at: respondedAt,
    status,
  } = value;

  if (
    !isString(id) ||
    !isNullableString(status) ||
    !isString(previousEndDate) ||
    !isString(proposedEndDate) ||
    typeof body !== 'string' ||
    !isString(createdAt) ||
    !isNullableString(respondedAt)
  ) {
    throw new Error(message);
  }

  return {
    id,
    status: matchEnum(status, LOAN_EXTENSION_STATUSES),
    previous_end_date: previousEndDate,
    proposed_end_date: proposedEndDate,
    message: body,
    created_at: createdAt,
    responded_at: respondedAt ?? null,
  };
}

/** Null when absent or null; older backends omit the key. */
export function parseNullableLoanExtensionRequest(
  value: unknown,
  message: string,
): LoanExtensionRequest | null {
  return value === null || value === undefined
    ? null
    : parseLoanExtensionRequest(value, message);
}
