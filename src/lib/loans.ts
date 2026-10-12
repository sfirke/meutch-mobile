import { buildJsonRequestInit, readJsonOrThrow, type ApiFetch } from './api';
import { parseMessageSummary, type MessageSummary } from './messages';
import {
  buildQueryString,
  isNullableNumber,
  isNullableString,
  isObject,
  isString,
  LOAN_STATUSES,
  matchEnum,
  normalizeImageUrl,
  parseArray,
  parsePagination,
  parseUserSummary,
  type LoanStatus,
  type Pagination,
  type QueryParam,
  type UserSummary,
} from './parse';

export const LOAN_ROLES = ['borrowing', 'lending'] as const;

export type LoanRole = (typeof LOAN_ROLES)[number];

export const LOAN_DUE_STATES = [
  'overdue',
  'due_today',
  'due_soon',
  'on_time',
] as const;

export type LoanTone = 'warning' | 'success' | 'neutral';

export type LoanDueState = (typeof LOAN_DUE_STATES)[number];

export type LoanActivityItem = {
  id: string;
  name: string;
  available: boolean;
  image_url: string | null;
};

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

export type LoanActivity = {
  id: string;
  status: LoanStatus | null;
  start_date: string;
  end_date: string;
  item: LoanActivityItem;
  /** Null when the account was deleted. */
  owner: UserSummary | null;
  borrower: UserSummary | null;
  latest_conversation_message_id: string | null;
  due_state: LoanDueState | null;
  days_until_due: number | null;
  days_overdue: number | null;
  pending_extension_request: LoanExtensionRequest | null;
};

export type LoanDetail = LoanActivity & { created_at: string };

export type LoanListPage = {
  loans: LoanActivity[];
  pagination: Pagination;
};

export type LoanDetailResponse = {
  loan: LoanDetail;
};

export const LOAN_ACTIONS = [
  'approve',
  'deny',
  'cancel',
  'owner-cancel',
  'complete',
] as const;

export type LoanAction = (typeof LOAN_ACTIONS)[number];

export type LoanRequestInput = {
  start_date: string;
  end_date: string;
  message: string;
};

/** `message` is optional; send it only when non-empty. */
export type LoanExtendInput = { new_end_date: string; message?: string };

export type LoanExtensionRequestInput = {
  proposed_end_date: string;
  message: string;
};

export type LoanExtensionDecision = 'approve' | 'deny';

export type LoanMutationResponse = {
  loan: LoanDetail;
  message: MessageSummary;
};

export type LoanExtendResponse = LoanMutationResponse & {
  is_extension: boolean;
};

export type FetchMyLoansOptions = {
  role: LoanRole;
  page: number;
  perPage?: number;
  signal?: AbortSignal;
};

export type FetchLoanDetailOptions = {
  signal?: AbortSignal;
};

const INVALID_LOAN = 'Invalid loan payload.';
const INVALID_LOANS = 'Invalid loans payload.';
const INVALID_LOAN_DETAIL = 'Invalid loan detail payload.';
const INVALID_LOAN_MUTATION = 'Invalid loan mutation payload.';
const INVALID_LOAN_EXTEND = 'Invalid loan extend payload.';

function capitalize(value: string): string {
  return value.length === 0
    ? value
    : value.charAt(0).toUpperCase() + value.slice(1);
}

export function describeLoanStatus(loan: { status: LoanStatus | null }): {
  label: string;
  tone: LoanTone;
} {
  if (loan.status === 'pending') {
    return { label: 'Loan request pending', tone: 'warning' };
  }

  if (loan.status === 'approved') {
    return { label: 'Loan approved', tone: 'success' };
  }

  return {
    label: loan.status ? capitalize(loan.status) : 'Loan',
    tone: 'neutral',
  };
}

function pluralizeDays(count: number): string {
  return `${count} ${count === 1 ? 'day' : 'days'}`;
}

/** Due-date wording for approved loans only; otherwise null. */
export function describeLoanDue(loan: LoanActivity): string | null {
  if (loan.status !== 'approved') {
    return null;
  }

  if (loan.due_state === 'overdue' && typeof loan.days_overdue === 'number') {
    return `Overdue by ${pluralizeDays(loan.days_overdue)}`;
  }

  if (loan.due_state === 'due_today') {
    return 'Due today';
  }

  if (
    (loan.due_state === 'due_soon' || loan.due_state === 'on_time') &&
    typeof loan.days_until_due === 'number'
  ) {
    return `Due in ${pluralizeDays(loan.days_until_due)}`;
  }

  return null;
}

function parseLoanActivityItem(value: unknown): LoanActivityItem {
  if (!isObject(value)) {
    throw new Error(INVALID_LOAN);
  }

  const { available, id, image_url: imageUrl, name } = value;

  if (
    !isString(id) ||
    !isString(name) ||
    typeof available !== 'boolean' ||
    !isNullableString(imageUrl)
  ) {
    throw new Error(INVALID_LOAN);
  }

  return { id, name, available, image_url: normalizeImageUrl(imageUrl) };
}

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

function parseNullableUser(value: unknown): UserSummary | null {
  return value === null || value === undefined
    ? null
    : parseUserSummary(value, INVALID_LOAN);
}

export function parseLoanActivity(value: unknown): LoanActivity {
  if (!isObject(value)) {
    throw new Error(INVALID_LOAN);
  }

  const {
    borrower,
    days_overdue: daysOverdue,
    days_until_due: daysUntilDue,
    due_state: dueState,
    end_date: endDate,
    id,
    item,
    latest_conversation_message_id: latestMessageId,
    owner,
    pending_extension_request: pendingExtension,
    start_date: startDate,
    status,
  } = value;

  if (
    !isString(id) ||
    !isString(startDate) ||
    !isString(endDate) ||
    !isNullableString(status) ||
    !isNullableString(dueState) ||
    !isNullableString(latestMessageId) ||
    !isNullableNumber(daysUntilDue) ||
    !isNullableNumber(daysOverdue)
  ) {
    throw new Error(INVALID_LOAN);
  }

  return {
    id,
    status: matchEnum(status, LOAN_STATUSES),
    start_date: startDate,
    end_date: endDate,
    item: parseLoanActivityItem(item),
    owner: parseNullableUser(owner),
    borrower: parseNullableUser(borrower),
    latest_conversation_message_id: latestMessageId ?? null,
    due_state: matchEnum(dueState, LOAN_DUE_STATES),
    days_until_due: daysUntilDue ?? null,
    days_overdue: daysOverdue ?? null,
    pending_extension_request: parseNullableLoanExtensionRequest(
      pendingExtension,
      INVALID_LOAN,
    ),
  };
}

export function parseLoanDetail(value: unknown): LoanDetail {
  const loan = parseLoanActivity(value);

  if (!isObject(value) || !isString(value.created_at)) {
    throw new Error(INVALID_LOAN);
  }

  return { ...loan, created_at: value.created_at };
}

export function parseLoanListPage(value: unknown): LoanListPage {
  if (!isObject(value)) {
    throw new Error(INVALID_LOANS);
  }

  return {
    loans: parseArray(value.loans, INVALID_LOANS).map(parseLoanActivity),
    pagination: parsePagination(value.pagination),
  };
}

export function parseLoanDetailResponse(value: unknown): LoanDetailResponse {
  if (!isObject(value)) {
    throw new Error(INVALID_LOAN_DETAIL);
  }

  return { loan: parseLoanDetail(value.loan) };
}

export function parseLoanMutationResponse(
  value: unknown,
): LoanMutationResponse {
  if (!isObject(value)) {
    throw new Error(INVALID_LOAN_MUTATION);
  }

  return {
    loan: parseLoanDetail(value.loan),
    message: parseMessageSummary(value.message),
  };
}

export function parseLoanExtendResponse(value: unknown): LoanExtendResponse {
  if (!isObject(value) || typeof value.is_extension !== 'boolean') {
    throw new Error(INVALID_LOAN_EXTEND);
  }

  return {
    ...parseLoanMutationResponse(value),
    is_extension: value.is_extension,
  };
}

export async function fetchMyLoans(
  fetchImpl: ApiFetch,
  options: FetchMyLoansOptions,
): Promise<LoanListPage> {
  const params: QueryParam[] = [
    ['role', options.role],
    ['status', 'all'],
    ['page', String(options.page)],
  ];

  if (options.perPage !== undefined) {
    params.push(['per_page', String(options.perPage)]);
  }

  const response = await fetchImpl(`/me/loans${buildQueryString(params)}`, {
    signal: options.signal,
  });

  return parseLoanListPage(await readJsonOrThrow<unknown>(response));
}

export async function fetchLoanDetail(
  fetchImpl: ApiFetch,
  id: string,
  options?: FetchLoanDetailOptions,
): Promise<LoanDetailResponse> {
  const response = await fetchImpl(`/loans/${encodeURIComponent(id)}`, {
    signal: options?.signal,
  });

  return parseLoanDetailResponse(await readJsonOrThrow<unknown>(response));
}

export async function requestLoan(
  fetchImpl: ApiFetch,
  itemId: string,
  input: LoanRequestInput,
): Promise<LoanMutationResponse> {
  const response = await fetchImpl(
    `/items/${encodeURIComponent(itemId)}/loan-requests`,
    buildJsonRequestInit(input, { method: 'POST' }),
  );

  return parseLoanMutationResponse(await readJsonOrThrow<unknown>(response));
}

export async function performLoanAction(
  fetchImpl: ApiFetch,
  loanId: string,
  action: LoanAction,
): Promise<LoanMutationResponse> {
  const response = await fetchImpl(
    `/loans/${encodeURIComponent(loanId)}/${action}`,
    { method: 'POST', headers: { Accept: 'application/json' } },
  );

  return parseLoanMutationResponse(await readJsonOrThrow<unknown>(response));
}

export async function extendLoan(
  fetchImpl: ApiFetch,
  loanId: string,
  input: LoanExtendInput,
): Promise<LoanExtendResponse> {
  const message = input.message?.trim();
  const body = message
    ? { new_end_date: input.new_end_date, message }
    : { new_end_date: input.new_end_date };
  const response = await fetchImpl(
    `/loans/${encodeURIComponent(loanId)}/extend`,
    buildJsonRequestInit(body, { method: 'POST' }),
  );

  return parseLoanExtendResponse(await readJsonOrThrow<unknown>(response));
}

export async function requestLoanExtension(
  fetchImpl: ApiFetch,
  loanId: string,
  input: LoanExtensionRequestInput,
): Promise<LoanMutationResponse> {
  const response = await fetchImpl(
    `/loans/${encodeURIComponent(loanId)}/extension-requests`,
    buildJsonRequestInit(input, { method: 'POST' }),
  );

  return parseLoanMutationResponse(await readJsonOrThrow<unknown>(response));
}

/** Owner-only; the backend 409s once the request is no longer pending. */
export async function decideLoanExtension(
  fetchImpl: ApiFetch,
  extensionId: string,
  decision: LoanExtensionDecision,
): Promise<LoanMutationResponse> {
  const response = await fetchImpl(
    `/loan-extension-requests/${encodeURIComponent(extensionId)}/${decision}`,
    { method: 'POST', headers: { Accept: 'application/json' } },
  );

  return parseLoanMutationResponse(await readJsonOrThrow<unknown>(response));
}
