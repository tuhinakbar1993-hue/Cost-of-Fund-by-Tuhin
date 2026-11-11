/**
 * Automatic PDF Report Type Detection.
 * Strictly detects by text content, never from filename.
 */

import { DetectedReportType } from '../types';

export function detectReportType(fullText: string): DetectedReportType {
  const normalized = fullText.replace(/\s+/g, ' ');

  if (/Investment\s+Ledger\s+Report/i.test(normalized)) {
    return 'INVESTMENT_LEDGER';
  }

  if (/Customer\s+Outstanding\s+Report/i.test(normalized)) {
    return 'CUSTOMER_OUTSTANDING';
  }

  if (/Perform[ae]nce\s+Report\s+of/i.test(normalized)) {
    return 'PARTY_PERFORMANCE';
  }

  return 'UNKNOWN';
}

/**
 * Extracts a 13-digit CBS account number if present in text.
 */
export function extract13DigitAccountNo(text: string): string | null {
  // 13 continuous digits e.g. 0547100001346
  const match = text.match(/\b(0\d{12}|\d{13})\b/);
  return match ? match[1] : null;
}
