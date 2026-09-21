import { formatCalendarDate, parseCalendarDate } from '../dates';

const originalTimeZone = process.env.TZ;

afterAll(() => {
  process.env.TZ = originalTimeZone;
});

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
    process.env.TZ = 'America/Los_Angeles';

    // The hazard this helper exists to avoid: the string parses as UTC
    // midnight, which is the previous day locally.
    expect(new Date('2026-06-03').getDate()).toBe(2);
    expect(formatCalendarDate('2026-06-03')).toBe('Jun 3, 2026');
  });

  test('keeps the calendar day in a positive-offset timezone', () => {
    process.env.TZ = 'Pacific/Kiritimati';

    expect(formatCalendarDate('2026-06-03')).toBe('Jun 3, 2026');
  });
});
