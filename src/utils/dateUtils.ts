/**
 * Strict UTC Date utilities for financial calculations.
 * Always uses Date.UTC integer day numbers to avoid any local timezone shifts.
 */

const MS_PER_DAY = 86400000;

export interface UtcDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/**
 * Parses dd/mm/yyyy or dd/mm/yy into a strict UTC integer day number.
 * e.g. "25/04/2019" -> day number
 */
export function parseDateToUtcDay(dateStr: string): number {
  if (!dateStr) return 0;
  const cleaned = dateStr.trim().replace(/\./g, '/').replace(/-/g, '/');
  const parts = cleaned.split('/');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format (expected dd/mm/yyyy): "${dateStr}"`);
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);

  // Handle 2-digit year (e.g. Party Performance "25/04/19")
  if (year < 100) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error(`Invalid numeric date values in "${dateStr}"`);
  }

  return datePartsToUtcDay(year, month, day);
}

/**
 * Returns integer day number for year, month (1-12), day (1-31) in UTC.
 */
export function datePartsToUtcDay(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/**
 * Converts a UTC day number to { year, month, day }.
 */
export function utcDayToParts(dayNumber: number): UtcDateParts {
  const d = new Date(dayNumber * MS_PER_DAY);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * Formats a UTC day number as "dd/mm/yyyy".
 */
export function formatUtcDay(dayNumber: number, delimiter = '/'): string {
  const { year, month, day } = utcDayToParts(dayNumber);
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const yyyy = String(year);
  return `${dd}${delimiter}${mm}${delimiter}${yyyy}`;
}

/**
 * Formats a UTC day number as "dd.mm.yyyy".
 */
export function formatUtcDayDot(dayNumber: number): string {
  return formatUtcDay(dayNumber, '.');
}

/**
 * Returns inclusive days between startDay and endDay: endDay - startDay + 1.
 */
export function getInclusiveDays(startDay: number, endDay: number): number {
  return endDay - startDay + 1;
}

/**
 * Returns UTC day number for the start of the year (01/01/YYYY).
 */
export function getYearStartUtcDay(year: number): number {
  return datePartsToUtcDay(year, 1, 1);
}

/**
 * Returns UTC day number for the end of the year (31/12/YYYY).
 */
export function getYearEndUtcDay(year: number): number {
  return datePartsToUtcDay(year, 12, 31);
}

export interface YearIntervalSegment {
  year: number;
  startUtcDay: number;
  endUtcDay: number;
  startDateStr: string;
  endDateStr: string;
  effectiveDays: number;
}

/**
 * Splits an interval [startUtcDay, endUtcDay] at each calendar year boundary (31 Dec / 1 Jan).
 * Both bounds are inclusive.
 * e.g. [25/04/2019, 16/04/2024] produces:
 * - 2019: 25/04/2019 to 31/12/2019 (251 days)
 * - 2020: 01/01/2020 to 31/12/2020 (366 days)
 * - 2021: 01/01/2021 to 31/12/2021 (365 days)
 * - 2022: 01/01/2022 to 31/12/2022 (365 days)
 * - 2023: 01/01/2023 to 31/12/2023 (365 days)
 * - 2024: 01/01/2024 to 16/04/2024 (107 days)
 */
export function splitIntervalByCalendarYears(
  startUtcDay: number,
  endUtcDay: number
): YearIntervalSegment[] {
  if (endUtcDay < startUtcDay) {
    return [];
  }

  const segments: YearIntervalSegment[] = [];
  const startParts = utcDayToParts(startUtcDay);
  const endParts = utcDayToParts(endUtcDay);

  let currentStart = startUtcDay;

  for (let y = startParts.year; y <= endParts.year; y++) {
    const yearEndDay = getYearEndUtcDay(y);
    const segEnd = Math.min(endUtcDay, yearEndDay);

    if (segEnd >= currentStart) {
      const days = getInclusiveDays(currentStart, segEnd);
      segments.push({
        year: y,
        startUtcDay: currentStart,
        endUtcDay: segEnd,
        startDateStr: formatUtcDay(currentStart),
        endDateStr: formatUtcDay(segEnd),
        effectiveDays: days,
      });
    }

    currentStart = getYearStartUtcDay(y + 1);
  }

  return segments;
}

/**
 * Converts a UTC day number to an Excel serial number or Date object.
 * Uses exact UTC midnight to guarantee integer serial date numbers in Excel.
 */
export function utcDayToDateObj(dayNumber: number): Date {
  const parts = utcDayToParts(dayNumber);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0));
}

/**
 * Converts a date string (dd/mm/yyyy, dd.mm.yyyy, dd-mm-yyyy) or UTC day number
 * into a genuine UTC Date object for Excel date storage.
 * ExcelJS serializes Date objects as genuine Excel date values with date formatting.
 */
export function parseDateToExcelDate(dateStrOrDay: string | number): Date {
  if (typeof dateStrOrDay === 'number') {
    return utcDayToDateObj(dateStrOrDay);
  }
  const utcDay = parseDateToUtcDay(dateStrOrDay);
  return utcDayToDateObj(utcDay);
}
