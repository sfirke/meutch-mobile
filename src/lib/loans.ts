import { readJsonOrThrow, type ApiFetch } from './api';
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
};

export type LoanDetail = LoanActivity & { created_at: string };

export type LoanListPage = {
  loans: LoanActivity[];
  pagination: Pagination;
};

export type LoanDetailResponse = {
  loan: LoanDetail;
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
