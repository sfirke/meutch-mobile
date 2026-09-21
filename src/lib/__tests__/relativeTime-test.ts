import { formatRelativeTime } from '../relativeTime';

const NOW = new Date('2026-05-26T18:30:00.000Z');

describe('formatRelativeTime', () => {
  test('returns "just now" for a timestamp seconds ago', () => {
    expect(formatRelativeTime('2026-05-26T18:29:45.000Z', NOW)).toBe(
      'just now',
    );
  });

  test('returns "just now" for a future timestamp (clock skew)', () => {
    expect(formatRelativeTime('2026-05-26T18:35:00.000Z', NOW)).toBe(
      'just now',
    );
  });

  test('returns minutes ago', () => {
    expect(formatRelativeTime('2026-05-26T18:25:00.000Z', NOW)).toBe('5m ago');
  });

  test('returns hours ago', () => {
    expect(formatRelativeTime('2026-05-26T15:30:00.000Z', NOW)).toBe('3h ago');
  });

  test('returns days ago', () => {
    expect(formatRelativeTime('2026-05-24T18:30:00.000Z', NOW)).toBe('2d ago');
  });

  test('returns a short date once a week has passed, same year', () => {
    expect(formatRelativeTime('2026-05-01T18:30:00.000Z', NOW)).toBe('May 1');
  });

  test('returns a short date with a year once the year differs', () => {
    expect(formatRelativeTime('2025-05-01T18:30:00.000Z', NOW)).toBe(
      'May 1, 2025',
    );
  });

  test('returns an empty string for an unparseable date', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBe('');
  });
});
