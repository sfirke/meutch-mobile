import { readJsonOrThrow, type ApiFetch } from './api';
import type { ItemCategory } from './items';
import { isObject, isString, parseArray } from './parse';

export type FetchCategoriesOptions = {
  signal?: AbortSignal;
};

const INVALID_CATEGORIES = 'Invalid categories payload.';

function parseCategory(value: unknown): ItemCategory {
  if (!isObject(value) || !isString(value.id) || !isString(value.name)) {
    throw new Error(INVALID_CATEGORIES);
  }

  return { id: value.id, name: value.name };
}

export function parseCategoriesResponse(value: unknown): ItemCategory[] {
  if (!isObject(value)) {
    throw new Error(INVALID_CATEGORIES);
  }

  return parseArray(value.categories, INVALID_CATEGORIES).map(parseCategory);
}

export async function fetchCategories(
  fetchImpl: ApiFetch,
  options?: FetchCategoriesOptions,
): Promise<ItemCategory[]> {
  const response = await fetchImpl('/categories', { signal: options?.signal });

  return parseCategoriesResponse(await readJsonOrThrow<unknown>(response));
}
