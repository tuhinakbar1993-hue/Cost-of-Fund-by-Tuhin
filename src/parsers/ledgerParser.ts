/**
 * Parser for Core Banking System (CBS) Investment Ledger Reports.
 * Reconstructs transaction rows from pdf.js text items with coordinate binning.
 */

import { LedgerReport, LedgerTransaction } from '../types';
import { parseDateToUtcDay } from '../utils/dateUtils';
import { parseCleanNumber, round2 } from '../utils/numberUtils';
import { ExtractedPdfDocument, PdfTextItem } from './pdfTextExtractor';

interface TextLine {
  y: number;
  items: PdfTextItem[];
  lineText: string;
}

/**
 * Groups PDF text items into lines based on y-coordinate tolerance.
 * Sorts lines from top to bottom (descending y in PDF space).
 * Within each line, items are sorted by x ascending.
 */
export function groupItemsIntoLines(items: PdfTextItem[], yTolerance = 3.0): TextLine[] {
  // Sort by y descending first
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: TextLine[] = [];

  for (const item of sorted) {
    if (!item.str.trim()) continue;

    // Find existing line within yTolerance
    let line = lines.find((l) => Math.abs(l.y - item.y) <= yTolerance);
    if (!line) {
      line = { y: item.y, items: [], lineText: '' };
      lines.push(line);
    }
    line.items.push(item);
  }

  // Sort items in each line by x ascending, build lineText
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.lineText = line.items.map((it) => it.str).join(' ');
  }

  // Sort lines from top of page to bottom
  lines.sort((a, b) => b.y - a.y);

  return lines;
}

export function parseLedgerReport(
  pdfDoc: ExtractedPdfDocument,
  fileName: string,
  fileHash: string
): LedgerReport {
  const fullText = pdfDoc.fullText;

  // Extract Header Info
  // A/C No: 13 digits
  const acMatch = fullText.match(/(?:A\/C\s*No\.?|Account\s*No\.?)[\s:]*([0-9]{13})\b/i) ||
    fullText.match(/\b([0-9]{13})\b/);
  const accountNo = acMatch ? acMatch[1] : '';

  // A/C Name
  let accountName = '';
  const nameMatch = fullText.match(/(?:A\/C\s*Name|Account\s*Name)[\s:]*([^\n\r,]+?)(?=(?:Type|Opening|Date|$))/i);
  if (nameMatch) {
    accountName = nameMatch[1].trim();
  }

  // Type of Account
  let accountType = '';
  const typeMatch = fullText.match(/(?:Type\s*of\s*Account|Account\s*Type)[\s:]*([^\n\r,]+?)(?=(?:Opening|Date|$))/i);
  if (typeMatch) {
    accountType = typeMatch[1].trim();
  }

  // Dates
  const openMatch = fullText.match(/(?:Date\s*of\s*Opening|Opening\s*Date)[\s:]*([0-9]{2}[\/.-][0-9]{2}[\/.-][0-9]{4})/i);
  const openingDate = openMatch ? openMatch[1].replace(/[.-]/g, '/') : '';

  const expMatch = fullText.match(/(?:Date\s*of\s*Expiry|Expiry\s*Date)[\s:]*([0-9]{2}[\/.-][0-9]{2}[\/.-][0-9]{4})/i);
  const expiryDate = expMatch ? expMatch[1].replace(/[.-]/g, '/') : '';

  const lastTxMatch = fullText.match(/(?:Last\s*Transaction\s*Date|Last\s*Tx\s*Date)[\s:]*([0-9]{2}[\/.-][0-9]{2}[\/.-][0-9]{4})/i);
  const lastTxDate = lastTxMatch ? lastTxMatch[1].replace(/[.-]/g, '/') : '';

  // Process all pages and merge table rows
  const allLines: TextLine[] = [];
  for (const page of pdfDoc.pages) {
    const pageLines = groupItemsIntoLines(page.items);
    allLines.push(...pageLines);
  }

  const transactions: LedgerTransaction[] = [];
  let totalDebitPrincipal = 0;
  let totalDebitGestation = 0;
  let totalDebitProfit = 0;
  let totalDebitCompensation = 0;
  let totalDebitCharge = 0;
  let totalCreditPrincipal = 0;
  let totalCreditGestation = 0;
  let totalCreditProfit = 0;
  let totalCreditCompensation = 0;
  let totalCreditCharge = 0;

  // Regex to recognize a date at the start of a transaction row
  const dateRegex = /\b([0-9]{2}[\/.-][0-9]{2}[\/.-][0-9]{4})\b/;

  let runningPrincipal = 0;

  for (const line of allLines) {
    const text = line.lineText.trim();

    // Skip brought forward (B/F) row
    if (/\bB\/F\b/i.test(text) || /Balance\s+B\/F/i.test(text)) {
      continue;
    }

    // Check for totals row at the end
    if (/^Total\b/i.test(text) || /\bGrand\s+Total\b/i.test(text)) {
      const numbers = line.items
        .map((it) => parseCleanNumber(it.str))
        .filter((n) => n !== 0 || itIsZero(line.items));
      if (numbers.length >= 10) {
        totalDebitPrincipal = numbers[0];
        totalDebitGestation = numbers[1];
        totalDebitProfit = numbers[2];
        totalDebitCompensation = numbers[3];
        totalDebitCharge = numbers[4];
        totalCreditPrincipal = numbers[5];
        totalCreditGestation = numbers[6];
        totalCreditProfit = numbers[7];
        totalCreditCompensation = numbers[8];
        totalCreditCharge = numbers[9];
      }
      continue;
    }

    // Check if line starts with a date
    const dMatch = line.items[0]?.str.match(dateRegex) || text.match(dateRegex);
    if (!dMatch) {
      continue;
    }

    // Extract numbers in the row
    // A standard transaction row contains:
    // Date, then 5 Debit, 5 Credit, 5 Balance, plus optional Total (16 items)
    // Or if some items are merged / missing, extract by spatial positions
    const dateStr = dMatch[1].replace(/[.-]/g, '/');

    // Extract all numeric tokens from the line items
    const rawTokens = line.items
      .map((it) => it.str.trim())
      .filter((s) => s.length > 0 && !s.match(dateRegex));

    // Numbers present in row
    const nums = rawTokens.map((t) => parseCleanNumber(t));

    // Standard column assignment
    // Debit: Principal, Gestation, Profit, Compensation, Charge
    // Credit: Principal, Gestation, Profit, Compensation, Charge
    // Balance: Principal, Gestation, Profit, Compensation, Charge
    let debPrinc = 0;
    let debGest = 0;
    let debProf = 0;
    let debComp = 0;
    let debChrg = 0;

    let credPrinc = 0;
    let credGest = 0;
    let credProf = 0;
    let credComp = 0;
    let credChrg = 0;

    let balPrinc = 0;
    let balGest = 0;
    let balProf = 0;
    let balComp = 0;
    let balChrg = 0;

    if (nums.length >= 15) {
      debPrinc = nums[0];
      debGest = nums[1];
      debProf = nums[2];
      debComp = nums[3];
      debChrg = nums[4];

      credPrinc = nums[5];
      credGest = nums[6];
      credProf = nums[7];
      credComp = nums[8];
      credChrg = nums[9];

      balPrinc = nums[10];
      balGest = nums[11];
      balProf = nums[12];
      balComp = nums[13];
      balChrg = nums[14];
    } else {
      // Map based on x-coordinate clustering if fewer tokens extracted
      // Use reasonable defaults
      if (nums.length >= 3) {
        // e.g. [DebitPrinc, CreditPrinc, BalPrinc]
        debPrinc = nums[0];
        credPrinc = nums[1];
        balPrinc = nums[2];
      }
    }

    // Update running principal
    if (transactions.length === 0) {
      runningPrincipal = balPrinc || debPrinc;
    } else {
      runningPrincipal = round2(runningPrincipal + debPrinc - credPrinc);
      if (!balPrinc) balPrinc = runningPrincipal;
    }

    transactions.push({
      date: dateStr,
      dateUtcDay: parseDateToUtcDay(dateStr),
      debitPrincipal: debPrinc,
      debitGestation: debGest,
      debitProfit: debProf,
      debitCompensation: debComp,
      debitCharge: debChrg,
      creditPrincipal: credPrinc,
      creditGestation: credGest,
      creditProfit: credProf,
      creditCompensation: credComp,
      creditCharge: credChrg,
      balancePrincipal: balPrinc,
      balanceGestation: balGest,
      balanceProfit: balProf,
      balanceCompensation: balComp,
      balanceCharge: balChrg,
      total: nums.length > 15 ? nums[15] : balPrinc,
    });
  }

  // Calculate totals from transactions if totals row was absent or partial
  if (totalDebitPrincipal === 0 && totalCreditPrincipal === 0 && transactions.length > 0) {
    totalDebitPrincipal = transactions.reduce((acc, t) => acc + t.debitPrincipal, 0);
    totalDebitGestation = transactions.reduce((acc, t) => acc + t.debitGestation, 0);
    totalDebitProfit = transactions.reduce((acc, t) => acc + t.debitProfit, 0);
    totalDebitCompensation = transactions.reduce((acc, t) => acc + t.debitCompensation, 0);
    totalDebitCharge = transactions.reduce((acc, t) => acc + t.debitCharge, 0);

    totalCreditPrincipal = transactions.reduce((acc, t) => acc + t.creditPrincipal, 0);
    totalCreditGestation = transactions.reduce((acc, t) => acc + t.creditGestation, 0);
    totalCreditProfit = transactions.reduce((acc, t) => acc + t.creditProfit, 0);
    totalCreditCompensation = transactions.reduce((acc, t) => acc + t.creditCompensation, 0);
    totalCreditCharge = transactions.reduce((acc, t) => acc + t.creditCharge, 0);
  }

  const finalPrincipalBalance =
    transactions.length > 0
      ? transactions[transactions.length - 1].balancePrincipal
      : 0;

  return {
    accountNo,
    accountName: accountName || 'Unknown Customer',
    accountType: accountType || 'MURABAHA',
    openingDate,
    expiryDate,
    lastTxDate,
    transactions,
    totalDebitPrincipal: round2(totalDebitPrincipal),
    totalDebitGestation: round2(totalDebitGestation),
    totalDebitProfit: round2(totalDebitProfit),
    totalDebitCompensation: round2(totalDebitCompensation),
    totalDebitCharge: round2(totalDebitCharge),
    totalCreditPrincipal: round2(totalCreditPrincipal),
    totalCreditGestation: round2(totalCreditGestation),
    totalCreditProfit: round2(totalCreditProfit),
    totalCreditCompensation: round2(totalCreditCompensation),
    totalCreditCharge: round2(totalCreditCharge),
    finalPrincipalBalance: round2(finalPrincipalBalance),
    fileName,
    fileHash,
  };
}

function itIsZero(items: PdfTextItem[]): boolean {
  return items.some((it) => it.str.trim() === '0' || it.str.trim() === '0.00');
}
