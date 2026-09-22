import type { FeedTypeFilter } from './feed';
import { normalizeSearchQuery } from './items';

export type FeedListFilters = {
  types?: FeedTypeFilter[];
};

export type ItemListFilters = {
  q?: string;
};

// These filter types will move to src/lib/messages.ts and src/lib/circles.ts
// once those modules exist.
export type InboxStatus = 'inbox' | 'archived';
export type CircleMembership = 'mine' | 'discoverable';

export type InboxListFilters = {
  status: InboxStatus;
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

export const messageKeys = {
  all: ['messages'] as const,
  inbox: (filters: InboxListFilters) =>
    [...messageKeys.all, 'inbox', { status: filters.status }] as const,
  thread: (messageId: string) =>
    [...messageKeys.all, 'thread', messageId] as const,
};

export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  settings: () => [...profileKeys.all, 'settings'] as const,
};
