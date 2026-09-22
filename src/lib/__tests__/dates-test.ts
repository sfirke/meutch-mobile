import {
  formatCalendarDate,
  formatMonthYear,
  parseCalendarDate,
} from '../dates';

/**
 * Reads a date's day-of-month in an explicit zone. Assigning `process.env.TZ`
 * mid-run does not reach V8's timezone cache under Jest, so a test that did
 * that silently asserted against whatever zone the machine happened to be in
 * and only failed on a UTC runner.
 */
function dayOfMonthIn(timeZone: string, date: Date): string {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone }).format(
    date,
  );
}

describe('parseCalendarDate', () => {
  test('reads the parts as written', () => {
    expect(parseCalendarDate('2026-06-03')).toEqual({
      year: 2026,
      month: 6,
      day: 3,
    });
  });

  test.each([
    '',
    '2026-6-3',
    '2026-06-03T00:00:00Z',
    'yesterday',
    '2026-13-01',
    '2026-00-01',
    '2026-06-32',
    '2026-06-00',
  ])('returns null for %p', (value) => {
    expect(parseCalendarDate(value)).toBeNull();
  });
});

describe('formatCalendarDate', () => {
  test('formats a calendar date', () => {
    expect(formatCalendarDate('2026-06-03')).toBe('Jun 3, 2026');
  });

  test('drops the leading zero from the day', () => {
    expect(formatCalendarDate('2026-01-09')).toBe('Jan 9, 2026');
  });

  test('formats the last day of the year', () => {
    expect(formatCalendarDate('2025-12-31')).toBe('Dec 31, 2025');
  });

  test('returns null for a value that is not a calendar date', () => {
    expect(formatCalendarDate('2026-06-03T18:30:00Z')).toBeNull();
  });

  test('keeps the calendar day in a negative-offset timezone', () => {
    // The hazard this helper exists to avoid: the string parses as UTC
    // midnight, which is the previous day everywhere west of Greenwich.
    const parsedAsUtcMidnight = new Date('2026-06-03');

    expect(parsedAsUtcMidnight.toISOString()).toBe('2026-06-03T00:00:00.000Z');
    expect(dayOfMonthIn('America/Los_Angeles', parsedAsUtcMidnight)).toBe('2');

    expect(formatCalendarDate('2026-06-03')).toBe('Jun 3, 2026');
  });

  test('keeps the calendar day in a positive-offset timezone', () => {
    const parsedAsUtcMidnight = new Date('2026-06-03');

    expect(dayOfMonthIn('Pacific/Kiritimati', parsedAsUtcMidnight)).toBe('3');

    expect(formatCalendarDate('2026-06-03')).toBe('Jun 3, 2026');
  });
});

describe('formatMonthYear', () => {
  test('formats a datetime input', () => {
    expect(formatMonthYear('2026-01-15T09:00:00+00:00')).toBe('Jan 2026');
  });

  test('formats a date-only input', () => {
    expect(formatMonthYear('2026-01-15')).toBe('Jan 2026');
  });

  test('keeps the written month at a late-in-month timestamp', () => {
    // The regex reads the digits as written; it never builds a `Date`, so a
    // timestamp near midnight cannot roll into the next month here.
    expect(formatMonthYear('2026-01-31T23:30:00+00:00')).toBe('Jan 2026');
  });

  test('returns null for junk', () => {
    expect(formatMonthYear('not a date')).toBeNull();
  });

  test('returns null for an out-of-range month', () => {
    expect(formatMonthYear('2026-13-01')).toBeNull();
  });
});
