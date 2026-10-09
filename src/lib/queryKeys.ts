import type { CircleMembership } from './circles';
import {
  DEFAULT_FEED_DISTANCE,
  isEveryFeedType,
  type FeedDistance,
  type FeedScope,
  type FeedTypeFilter,
} from './feed';
import {
  normalizeSearchQuery,
  type ItemSort,
  type ItemTypeFilter,
  type MyItemKind,
} from './items';
import type { LoanRole } from './loans';
import type { InboxSort, InboxStatus } from './messages';
import type { MyRequestStatus } from './requests';

export type FeedListFilters = {
  scope?: FeedScope;
  /** Omitted, empty, or every type means no type filter. */
  types?: FeedTypeFilter[];
  /** `null` is "no distance limit"; omitted is the backend default. */
  distance?: FeedDistance | null;
  showOwnActivity?: boolean;
  showClaimedGiveaways?: boolean;
};

export type ItemListFilters = {
  q?: string;
  /** Category ids; empty or omitted means every category. */
  categories?: string[];
  /** Circle ids; empty or omitted means every circle the member is in. */
  circles?: string[];
  itemType?: ItemTypeFilter;
  sort?: ItemSort;
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

function normalizeFeedTypes(
  types: FeedTypeFilter[] | undefined,
): FeedTypeFilter[] | null {
  if (!types || types.length === 0 || isEveryFeedType(types)) {
    return null;
  }

  return [...new Set(types)].sort();
}

export const feedKeys = {
  all: ['feed'] as const,
  // Normalized so an omitted filter shares the cache entry with the backend
  // default; `distance: null` (no limit) stays distinct from the default.
  list: (filters: FeedListFilters = {}) =>
    [
      ...feedKeys.all,
      'list',
      {
        scope: filters.scope ?? 'all',
        types: normalizeFeedTypes(filters.types),
        distance:
          filters.distance === undefined
            ? DEFAULT_FEED_DISTANCE
            : filters.distance,
        showOwnActivity: filters.showOwnActivity ?? true,
        showClaimedGiveaways: filters.showClaimedGiveaways ?? true,
      },
    ] as const,
};

// An empty id list is the same request as no list, and order never changes
// the response, so both collapse to one cache entry.
function normalizeIdList(ids: string[] | undefined): string[] | null {
  if (!ids || ids.length === 0) {
    return null;
  }

  return [...new Set(ids)].sort();
}

export const itemKeys = {
  all: ['items'] as const,
  // Normalized so a blank or padded query, an empty id list, or an omitted
  // default shares the cache entry with the request that omits it entirely.
  list: (filters: ItemListFilters = {}) =>
    [
      ...itemKeys.all,
      'list',
      {
        q: normalizeSearchQuery(filters.q),
        categories: normalizeIdList(filters.categories),
        circles: normalizeIdList(filters.circles),
        itemType: filters.itemType ?? 'both',
        sort: filters.sort ?? 'date',
      },
    ] as const,
  mine: (filters: MyItemListFilters) =>
    [
      ...itemKeys.all,
      'mine',
      { kind: filters.kind, q: normalizeSearchQuery(filters.q) },
    ] as const,
  detail: (id: string) => [...itemKeys.all, 'detail', id] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
};

export const circleKeys = {
  all: ['circles'] as const,
  hasAny: () => [...circleKeys.all, 'has-any'] as const,
  // Every circle the member belongs to, across pages, for filter pickers.
  mineAll: () => [...circleKeys.all, 'mine-all'] as const,
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
