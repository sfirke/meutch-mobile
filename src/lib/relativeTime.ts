const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

/**
 * Formats an ISO timestamp relative to `now`, injected so callers get a
 * deterministic result. An unparseable date returns `''`; a future
 * timestamp (clock skew) reads as "just now" rather than a negative value.
 */
export function formatRelativeTime(isoString: string, now: Date): string {
  const target = new Date(isoString).getTime();

  if (Number.isNaN(target)) {
    return '';
  }

  const diffMs = now.getTime() - target;

  if (diffMs < MINUTE_MS) {
    return 'just now';
  }

  if (diffMs < HOUR_MS) {
    return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  }

  if (diffMs < DAY_MS) {
    return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  }

  if (diffMs < WEEK_MS) {
    return `${Math.floor(diffMs / DAY_MS)}d ago`;
  }

  return formatShortDate(new Date(target), now);
}

function formatShortDate(date: Date, now: Date): string {
  const sameYear = date.getFullYear() === now.getFullYear();

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}
