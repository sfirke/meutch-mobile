export type LinkSegment =
  { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string };

// Port of the backend's linkify rules (app/template_filters.py in
// sfirke/meutch): http(s) URLs plus scheme-less "www." hosts.
const URL_PATTERN =
  /https?:\/\/[^\s<>"']+|www\.(?:[a-z0-9][-a-z0-9]*\.)+[a-z]{2,}(?::\d+)?(?:[/?#][^\s<>"']*)?/gi;

// Sentence punctuation that is not part of the link; includes the ellipsis
// left by truncation.
const TRAILING_PUNCTUATION = '.,;:!?\'"]}…';

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}

function trimTrailingPunctuation(url: string): string {
  let result = url;
  while (result.length > 0) {
    const last = result[result.length - 1];
    if (last === ')') {
      // Keep a closing paren the url opened, e.g. .../Foo_(bar).
      if (count(result, '(') >= count(result, ')')) {
        break;
      }
    } else if (!TRAILING_PUNCTUATION.includes(last)) {
      break;
    }
    result = result.slice(0, -1);
  }
  return result;
}

// Splits plain text into text and link segments. Empty input gives [].
export function splitLinks(text: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimTrailingPunctuation(match[0]);
    if (url === '') {
      continue;
    }
    if (match.index > cursor) {
      segments.push({ kind: 'text', text: text.slice(cursor, match.index) });
    }
    // A "www." match has no scheme; the visible text stays as typed.
    const href = url.includes('://') ? url : `https://${url}`;
    segments.push({ kind: 'link', text: url, href });
    cursor = match.index + url.length;
  }

  if (cursor < text.length) {
    segments.push({ kind: 'text', text: text.slice(cursor) });
  }
  return segments;
}

export function hasLinks(text: string): boolean {
  return splitLinks(text).some((segment) => segment.kind === 'link');
}
