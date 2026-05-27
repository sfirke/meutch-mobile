import { buildApiUrl } from '../config/env';

export function getApiUrl(path: string): string {
  return buildApiUrl(path);
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(getApiUrl(path), init);
}
