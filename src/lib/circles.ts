import { readJsonOrThrow, type ApiFetch } from './api';
import { isObject, parsePagination } from './parse';

export type FetchHasCirclesOptions = {
  signal?: AbortSignal;
};

// A user in no circles gets an empty items page rather than an error, and that
// is indistinguishable from "no search results" — hence this separate probe.
// Circles themselves are modelled in a later PR.
const HAS_CIRCLES_PATH = '/circles?membership=mine&per_page=1';

export async function fetchHasCircles(
  fetchImpl: ApiFetch,
  options?: FetchHasCirclesOptions,
): Promise<boolean> {
  const response = await fetchImpl(HAS_CIRCLES_PATH, {
    signal: options?.signal,
  });
  const payload = await readJsonOrThrow<unknown>(response);

  if (!isObject(payload)) {
    throw new Error('Invalid circles payload.');
  }

  return parsePagination(payload.pagination).total > 0;
}
