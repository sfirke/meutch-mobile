import type { CircleMembership } from './circles';
import type { FeedTypeFilter } from './feed';
import { normalizeSearchQuery, type MyItemKind } from './items';
import type { LoanRole } from './loans';
import type { InboxSort, InboxStatus } from './messages';
import type { MyRequestStatus } from './requests';

export type FeedListFilters = {
  types?: FeedTypeFilter[];
};

export type ItemListFilters = {
  q?: string;
};

export type MyItemListFilters = {
  kind: MyItemKind;
  q?: string;
};

export type MyRequestListFilters = {
  status: MyRequestStatus;
};

export type LoanListFilters = {
  role: LoanRole;
};

export type InboxListFilters = {
  status: InboxStatus;
  sort?: InboxSort;
};

export type CircleListFilters = {
  membership: CircleMembership;
  q?: string;
};

export const feedKeys = {
  all: ['feed'] as const,
  list: (filters: FeedListFilters = {}) =>
    [...feedKeys.all, 'list', { types: filters.types ?? null }] as const,
};

export const itemKeys = {
  all: ['items'] as const,
  // Normalized so a blank or padded query shares the cache entry with the
  // request that omits `q` entirely.
  list: (filters: ItemListFilters = {}) =>
    [...itemKeys.all, 'list', { q: normalizeSearchQuery(filters.q) }] as const,
  mine: (filters: MyItemListFilters) =>
    [
      ...itemKeys.all,
      'mine',
      { kind: filters.kind, q: normalizeSearchQuery(filters.q) },
    ] as const,
  detail: (id: string) => [...itemKeys.all, 'detail', id] as const,
};

export const circleKeys = {
  all: ['circles'] as const,
  hasAny: () => [...circleKeys.all, 'has-any'] as const,
  list: (filters: CircleListFilters) =>
    [
      ...circleKeys.all,
      'list',
      { membership: filters.membership, q: normalizeSearchQuery(filters.q) },
    ] as const,
  detail: (id: string) => [...circleKeys.all, 'detail', id] as const,
};

export const requestKeys = {
  all: ['requests'] as const,
  mine: (filters: MyRequestListFilters) =>
    [...requestKeys.all, 'mine', { status: filters.status }] as const,
  detail: (id: string) => [...requestKeys.all, 'detail', id] as const,
};

export const loanKeys = {
  all: ['loans'] as const,
  list: (filters: LoanListFilters) =>
    [...loanKeys.all, 'list', { role: filters.role }] as const,
  detail: (id: string) => [...loanKeys.all, 'detail', id] as const,
};

export const messageKeys = {
  all: ['messages'] as const,
  // An omitted sort shares the cache entry with the backend's default.
  inbox: (filters: InboxListFilters) =>
    [
      ...messageKeys.all,
      'inbox',
      { status: filters.status, sort: filters.sort ?? 'newest' },
    ] as const,
  thread: (messageId: string) =>
    [...messageKeys.all, 'thread', messageId] as const,
};

export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  settings: () => [...profileKeys.all, 'settings'] as const,
};

export const userKeys = {
  all: ['users'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

export const referenceKeys = {
  all: ['reference'] as const,
  categories: () => [...referenceKeys.all, 'categories'] as const,
  tags: () => [...referenceKeys.all, 'tags'] as const,
};
