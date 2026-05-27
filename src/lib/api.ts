import { buildApiUrl } from '../config/env';

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(buildApiUrl(path), init);
}
