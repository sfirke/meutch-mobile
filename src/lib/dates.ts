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
