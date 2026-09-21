import { readJsonOrThrow, type ApiFetch } from './api';
import {
  buildQueryString,
  isNullableNumber,
  isNullableString,
  isNumber,
  isObject,
  isString,
  normalizeImageUrl,
  parseArray,
  parsePagination,
  type Pagination,
  type QueryParam,
} from './parse';

export const ITEM_CLAIM_STATUSES = [
  'unclaimed',
  'pending_pickup',
  'claimed',
] as const;

export type ItemClaimStatus = (typeof ITEM_CLAIM_STATUSES)[number];

export const GIVEAWAY_VISIBILITIES = ['default', 'public'] as const;

export type GiveawayVisibility = (typeof GIVEAWAY_VISIBILITIES)[number];

export const LOAN_STATUSES = [
  'pending',
  'approved',
  'canceled',
  'denied',
  'completed',
] as const;

export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const VIEWER_INTEREST_STATUSES = ['active', 'selected'] as const;

export type ViewerInterestStatus = (typeof VIEWER_INTEREST_STATUSES)[number];

export type UserSummary = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_image_url: string | null;
};

export type ItemCategory = {
  id: string;
  name: string;
};

export type ItemTag = {
  id: string;
  name: string;
};

export type ItemSummary = {
  id: string;
  name: string;
  description: string | null;
  available: boolean;
  is_giveaway: boolean;
  giveaway_visibility: GiveawayVisibility | null;
  claim_status: ItemClaimStatus | null;
  created_at: string;
  image_url: string | null;
  owner: UserSummary;
  category: ItemCategory;
  tags: ItemTag[];
};

export type ItemImage = {
  id: string;
  url: string | null;
  position: number;
  created_at: string;
};

export type ItemLoanSummary = {
  id: string;
  /** `YYYY-MM-DD`, not a datetime. */
  start_date: string;
  end_date: string;
  status: LoanStatus;
  borrower: UserSummary | null;
};

export type ItemDetail = ItemSummary & {
  images: ItemImage[];
  claimed_by: UserSummary | null;
  current_loan: ItemLoanSummary | null;
  viewer_interest_status: ViewerInterestStatus | null;
  interested_count: number | null;
};

export type ItemViewerState = {
  is_owner: boolean;
  shares_circle_with_owner: boolean;
  is_active_borrower: boolean;
};

export type ItemListPage = {
  items: ItemSummary[];
  pagination: Pagination;
};

export type ItemDetailResponse = {
  item: ItemDetail;
  viewer: ItemViewerState;
};

export type FetchItemsOptions = {
  page: number;
  q?: string;
  /** The backend rejects `per_page` above 50 with a 422; it does not clamp. */
  perPage?: number;
  signal?: AbortSignal;
};

export type FetchItemDetailOptions = {
  signal?: AbortSignal;
};

const INVALID_ITEM = 'Invalid item payload.';
const INVALID_ITEMS = 'Invalid items payload.';
const INVALID_ITEM_DETAIL = 'Invalid item detail payload.';

export function normalizeSearchQuery(value: string | undefined): string | null {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function matchEnum<T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
): T | null {
  return typeof value === 'string' && allowedValues.includes(value as T)
    ? (value as T)
    : null;
}

function parseUserSummary(value: unknown, message: string): UserSummary {
  if (!isObject(value)) {
    throw new Error(message);
  }

  const {
    first_name: firstName,
    full_name: fullName,
    id,
    last_name: lastName,
    profile_image_url: profileImageUrl,
  } = value;

  if (
    !isString(id) ||
    !isString(firstName) ||
    !isString(lastName) ||
    !isString(fullName) ||
    !isNullableString(profileImageUrl)
  ) {
    throw new Error(message);
  }

  return {
    id,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    profile_image_url: normalizeImageUrl(profileImageUrl),
  };
}

function parseNamedReference(
  value: unknown,
  message: string,
): { id: string; name: string } {
  if (!isObject(value)) {
    throw new Error(message);
  }

  const { id, name } = value;

  if (!isString(id) || !isString(name)) {
    throw new Error(message);
  }

  return { id, name };
}

export function parseItemSummary(value: unknown): ItemSummary {
  if (!isObject(value)) {
    throw new Error(INVALID_ITEM);
  }

  const {
    available,
    category,
    claim_status: claimStatus,
    created_at: createdAt,
    description,
    giveaway_visibility: giveawayVisibility,
    id,
    image_url: imageUrl,
    is_giveaway: isGiveaway,
    name,
    owner,
    tags,
  } = value;

  if (
    !isString(id) ||
    !isString(name) ||
    !isString(createdAt) ||
    !isNullableString(description) ||
    typeof available !== 'boolean' ||
    typeof isGiveaway !== 'boolean' ||
    !isNullableString(giveawayVisibility) ||
    !isNullableString(claimStatus) ||
    !isNullableString(imageUrl)
  ) {
    throw new Error(INVALID_ITEM);
  }

  return {
    id,
    name,
    description: description ?? null,
    available,
    is_giveaway: isGiveaway,
    giveaway_visibility: matchEnum(giveawayVisibility, GIVEAWAY_VISIBILITIES),
    claim_status: matchEnum(claimStatus, ITEM_CLAIM_STATUSES),
    created_at: createdAt,
    image_url: normalizeImageUrl(imageUrl),
    owner: parseUserSummary(owner, INVALID_ITEM),
    category: parseNamedReference(category, INVALID_ITEM),
    tags: parseArray(tags, INVALID_ITEM).map((tag) =>
      parseNamedReference(tag, INVALID_ITEM),
    ),
  };
}

function parseItemImage(value: unknown): ItemImage {
  if (!isObject(value)) {
    throw new Error(INVALID_ITEM_DETAIL);
  }

  const { created_at: createdAt, id, position, url } = value;

  if (
    !isString(id) ||
    !isString(createdAt) ||
    !isNumber(position) ||
    !isNullableString(url)
  ) {
    throw new Error(INVALID_ITEM_DETAIL);
  }

  return {
    id,
    url: normalizeImageUrl(url),
    position,
    created_at: createdAt,
  };
}

function parseItemLoanSummary(value: unknown): ItemLoanSummary {
  if (!isObject(value)) {
    throw new Error(INVALID_ITEM_DETAIL);
  }

  const {
    borrower,
    end_date: endDate,
    id,
    start_date: startDate,
    status,
  } = value;

  if (
    !isString(id) ||
    !isString(startDate) ||
    !isString(endDate) ||
    !isString(status) ||
    !LOAN_STATUSES.includes(status as LoanStatus)
  ) {
    throw new Error(INVALID_ITEM_DETAIL);
  }

  return {
    id,
    start_date: startDate,
    end_date: endDate,
    status: status as LoanStatus,
    borrower:
      borrower === null || borrower === undefined
        ? null
        : parseUserSummary(borrower, INVALID_ITEM_DETAIL),
  };
}

export function parseItemDetail(value: unknown): ItemDetail {
  if (!isObject(value)) {
    throw new Error(INVALID_ITEM_DETAIL);
  }

  const summary = parseItemSummary(value);
  const {
    claimed_by: claimedBy,
    current_loan: currentLoan,
    images,
    interested_count: interestedCount,
    viewer_interest_status: viewerInterestStatus,
  } = value;

  if (
    !isNullableString(viewerInterestStatus) ||
    !isNullableNumber(interestedCount)
  ) {
    throw new Error(INVALID_ITEM_DETAIL);
  }

  return {
    ...summary,
    images: parseArray(images, INVALID_ITEM_DETAIL)
      .map(parseItemImage)
      .sort((first, second) => first.position - second.position),
    claimed_by:
      claimedBy === null || claimedBy === undefined
        ? null
        : parseUserSummary(claimedBy, INVALID_ITEM_DETAIL),
    current_loan:
      currentLoan === null || currentLoan === undefined
        ? null
        : parseItemLoanSummary(currentLoan),
    viewer_interest_status: matchEnum(
      viewerInterestStatus,
      VIEWER_INTEREST_STATUSES,
    ),
    interested_count: interestedCount ?? null,
  };
}

function parseItemViewerState(value: unknown): ItemViewerState {
  if (!isObject(value)) {
    throw new Error(INVALID_ITEM_DETAIL);
  }

  const {
    is_active_borrower: isActiveBorrower,
    is_owner: isOwner,
    shares_circle_with_owner: sharesCircleWithOwner,
  } = value;

  if (
    typeof isOwner !== 'boolean' ||
    typeof sharesCircleWithOwner !== 'boolean' ||
    typeof isActiveBorrower !== 'boolean'
  ) {
    throw new Error(INVALID_ITEM_DETAIL);
  }

  return {
    is_owner: isOwner,
    shares_circle_with_owner: sharesCircleWithOwner,
    is_active_borrower: isActiveBorrower,
  };
}

export function parseItemListPage(value: unknown): ItemListPage {
  if (!isObject(value)) {
    throw new Error(INVALID_ITEMS);
  }

  return {
    items: parseArray(value.items, INVALID_ITEMS).map(parseItemSummary),
    pagination: parsePagination(value.pagination),
  };
}

export function parseItemDetailResponse(value: unknown): ItemDetailResponse {
  if (!isObject(value)) {
    throw new Error(INVALID_ITEM_DETAIL);
  }

  return {
    item: parseItemDetail(value.item),
    viewer: parseItemViewerState(value.viewer),
  };
}

export async function fetchItems(
  fetchImpl: ApiFetch,
  options: FetchItemsOptions,
): Promise<ItemListPage> {
  const params: QueryParam[] = [['page', String(options.page)]];
  const searchQuery = normalizeSearchQuery(options.q);

  if (searchQuery) {
    params.push(['q', searchQuery]);
  }

  if (options.perPage !== undefined) {
    params.push(['per_page', String(options.perPage)]);
  }

  const response = await fetchImpl(`/items${buildQueryString(params)}`, {
    signal: options.signal,
  });

  return parseItemListPage(await readJsonOrThrow<unknown>(response));
}

export async function fetchItemDetail(
  fetchImpl: ApiFetch,
  id: string,
  options?: FetchItemDetailOptions,
): Promise<ItemDetailResponse> {
  const response = await fetchImpl(`/items/${encodeURIComponent(id)}`, {
    signal: options?.signal,
  });

  return parseItemDetailResponse(await readJsonOrThrow<unknown>(response));
}
