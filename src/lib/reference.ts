import { readJsonOrThrow, type ApiFetch } from './api';
import type { ItemTag } from './items';
import { isObject, isString, parseArray } from './parse';

export type { ItemTag };

export type FetchReferenceOptions = {
  signal?: AbortSignal;
};

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

export function parseTagsResponse(value: unknown): ItemTag[] {
  if (!isObject(value)) {
    throw new Error(INVALID_TAGS);
  }

  return parseArray(value.tags, INVALID_TAGS).map((entry) =>
    parseNamedEntry(entry, INVALID_TAGS),
  );
}

export async function fetchTags(
  fetchImpl: ApiFetch,
  options?: FetchReferenceOptions,
): Promise<ItemTag[]> {
  const response = await fetchImpl('/tags', { signal: options?.signal });

  return parseTagsResponse(await readJsonOrThrow<unknown>(response));
}
