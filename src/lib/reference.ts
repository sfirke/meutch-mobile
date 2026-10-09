import { readJsonOrThrow, type ApiFetch } from './api';
import type { ItemCategory, ItemTag } from './items';
import { isObject, isString, parseArray } from './parse';

export type { ItemCategory, ItemTag };

export type FetchReferenceOptions = {
  signal?: AbortSignal;
};

const INVALID_CATEGORIES = 'Received an invalid categories response.';
const INVALID_TAGS = 'Received an invalid tags response.';

function parseNamedEntry(
  value: unknown,
  message: string,
): { id: string; name: string } {
  if (!isObject(value) || !isString(value.id) || !isString(value.name)) {
    throw new Error(message);
  }

  return { id: value.id, name: value.name };
}

export function parseCategoriesResponse(value: unknown): ItemCategory[] {
  if (!isObject(value)) {
    throw new Error(INVALID_CATEGORIES);
  }

  return parseArray(value.categories, INVALID_CATEGORIES)
    .map((entry) => parseNamedEntry(entry, INVALID_CATEGORIES))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function parseTagsResponse(value: unknown): ItemTag[] {
  if (!isObject(value)) {
    throw new Error(INVALID_TAGS);
  }

  return parseArray(value.tags, INVALID_TAGS).map((entry) =>
    parseNamedEntry(entry, INVALID_TAGS),
  );
}

export async function fetchCategories(
  fetchImpl: ApiFetch,
  options?: FetchReferenceOptions,
): Promise<ItemCategory[]> {
  const response = await fetchImpl('/categories', { signal: options?.signal });

  return parseCategoriesResponse(await readJsonOrThrow<unknown>(response));
}

export async function fetchTags(
  fetchImpl: ApiFetch,
  options?: FetchReferenceOptions,
): Promise<ItemTag[]> {
  const response = await fetchImpl('/tags', { signal: options?.signal });

  return parseTagsResponse(await readJsonOrThrow<unknown>(response));
}
