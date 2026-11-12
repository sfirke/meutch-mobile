const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type CalendarDate = {
  year: number;
  /** 1-12, as written in the string — not a `Date` month index. */
  month: number;
  day: number;
};

/**
 * Reads a `YYYY-MM-DD` calendar date. Deliberately never builds a `Date` from
 * the string: `new Date('2026-06-03')` is UTC midnight, which renders as the
 * previous day everywhere west of Greenwich.
 */
export function parseCalendarDate(value: string): CalendarDate | null {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
}

/** Formats a `YYYY-MM-DD` date as `Jun 3, 2026`, or `null` if unparseable. */
export function formatCalendarDate(value: string): string | null {
  const date = parseCalendarDate(value);

  if (!date) {
    return null;
  }

  return `${MONTH_ABBREVIATIONS[date.month - 1]} ${date.day}, ${date.year}`;
}

const LEADING_MONTH_PATTERN = /^(\d{4})-(\d{2})/;

/**
 * Formats the leading `YYYY-MM` of an ISO date or datetime string as
 * `Jan 2026`, or `null` if unparseable. Reads the digits with a regex rather
 * than `new Date`, so the month cannot drift across a timezone boundary.
 */
export function formatMonthYear(value: string): string | null {
  const match = LEADING_MONTH_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    return null;
  }

  return `${MONTH_ABBREVIATIONS[month - 1]} ${year}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The local Y/M/D of a `Date` as `YYYY-MM-DD`. */
export function calendarDateFromLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * A `Date` at local midnight on the written day, or `null` if unparseable.
 * Built from the components, never from the string (see `parseCalendarDate`).
 */
export function localDateFromCalendarDate(value: string): Date | null {
  const date = parseCalendarDate(value);

  return date ? new Date(date.year, date.month - 1, date.day) : null;
}

/** Today's local date as `YYYY-MM-DD`. `now` is injectable for tests. */
export function todayCalendarDate(now: Date = new Date()): string {
  return calendarDateFromLocalDate(now);
}

/**
 * `value` plus `days` (negative to go back), via local `Date` arithmetic so
 * month and year boundaries roll over. Throws on an unparseable input.
 */
export function addCalendarDays(value: string, days: number): string {
  const date = localDateFromCalendarDate(value);

  if (!date) {
    throw new Error(`Not a calendar date: ${value}`);
  }

  date.setDate(date.getDate() + days);

  return calendarDateFromLocalDate(date);
}

/** Orders two `YYYY-MM-DD` strings; zero-padded ISO dates sort lexically. */
export function compareCalendarDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
