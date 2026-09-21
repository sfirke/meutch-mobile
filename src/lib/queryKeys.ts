import type { FeedTypeFilter } from './feed';
import { normalizeSearchQuery } from './items';

export type FeedListFilters = {
  types?: FeedTypeFilter[];
};

export type ItemListFilters = {
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
};
