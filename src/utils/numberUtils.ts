/**
 * Number and currency formatting utilities.
 * Handles Indian digit grouping (e.g., 5,04,290.67) for UI and standard numbers for Excel.
 */

/**
 * Formats a number in Indian digit grouping format with 2 decimals.
 * e.g., 504290.67 -> "5,04,290.67"
 * 0 or NaN -> "-" if zeroAsDash is true.
 */
export function formatBdt(val: number | null | undefined, zeroAsDash = false): string {
  if (val === null || val === undefined || isNaN(val)) {
    return zeroAsDash ? '-' : '0.00';
  }

  // Check if practically 0
  if (Math.abs(val) < 0.000001) {
    return zeroAsDash ? '-' : '0.00';
  }

  const isNeg = val < 0;
  const absVal = Math.abs(val);
  const rounded = absVal.toFixed(2);
  const [intPart, decPart] = rounded.split('.');

  // Format integer part using Indian grouping: last 3 digits, then groups of 2
  let formattedInt = '';
  if (intPart.length <= 3) {
    formattedInt = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const groups = [];
    let r = rest;
    while (r.length > 2) {
      groups.unshift(r.slice(-2));
      r = r.slice(0, -2);
    }
    if (r.length > 0) {
      groups.unshift(r);
    }
    formattedInt = groups.join(',') + ',' + last3;
  }

  const result = `${formattedInt}.${decPart}`;
  return isNeg ? `(${result})` : result;
}

/**
 * Formats a number in millions for summary display.
 * e.g. 691924.81 -> "0.6919"
 */
export function formatMillion(val: number | null | undefined, zeroAsDash = false): string {
  if (val === null || val === undefined || isNaN(val)) {
    return zeroAsDash ? '-' : '0.0000';
  }
  if (Math.abs(val) < 0.000001) {
    return zeroAsDash ? '-' : '0.0000';
  }
  const inMillions = val / 1_000_000;
  return inMillions.toFixed(4);
}

/**
 * Standard rounding to 2 decimal places using half-up arithmetic.
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Rounds to 4 decimal places.
 */
export function round4(num: number): number {
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
}

/**
 * Parses cleaned number string into float, stripping commas, parentheses, etc.
 */
export function parseCleanNumber(val: string | number | null | undefined): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const s = String(val).trim();
  if (s === '-' || s === '–' || s === '—' || s === '') return 0;

  // Handle parentheses for negative: (1,234.50) -> -1234.50
  const isParenNeg = s.startsWith('(') && s.endsWith(')');
  const cleaned = s.replace(/[(),]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return isParenNeg ? -num : num;
}
