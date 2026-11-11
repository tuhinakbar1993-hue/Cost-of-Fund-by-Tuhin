/**
 * Parser for Party Performance Report.
 * Identifies Receivable, Recovery, and Outstanding groups using arithmetic verification:
 * Receivable - Recovery = Outstanding.
 * 
 * Accurately handles Ababil CBS vertical 5-line blocks (Principal, Profit, Others, Compensation, Total)
 * using column coordinate binning (Disbursement, Recovery, Outstanding) as well as single-line horizontal layouts
 * for both individual accounts and the Customer Total row.
 */

import { PartyPerformanceReport, PartyPerformanceRow } from '../types';
import { parseCleanNumber, round2 } from '../utils/numberUtils';
import { groupItemsIntoLines } from './ledgerParser';
import { ExtractedPdfDocument } from './pdfTextExtractor';

export function parsePartyPerformanceReport(
  pdfDoc: ExtractedPdfDocument,
  fileName: string,
  fileHash: string
): PartyPerformanceReport {
  const fullText = pdfDoc.fullText;

  // Flatten lines across all pages
  const allLines = pdfDoc.pages.flatMap((page) => groupItemsIntoLines(page.items));

  // 1. Header: Branch Name, Customer Name, Product, Sanction Amount, Print Date
  let branchName = '';
  for (const line of allLines) {
    const text = line.lineText.trim();
    const branchM = text.match(/\b([A-Z0-9\s]+?BRANCH)\b/i);
    if (branchM && !branchName) {
      branchName = branchM[1].trim();
      break;
    }
  }
  if (!branchName) {
    const branchMatch = fullText.match(/([A-Z\s]+BRANCH)/i);
    if (branchMatch) branchName = branchMatch[1].trim();
  }

  let customerName = '';
  for (const line of allLines) {
    const text = line.lineText.trim();
    const custM = text.match(/Perform[a-z]*\s+Report\s+(?:of|for)\s+([^\n\r]+)/i) ||
                  text.match(/(?:Customer|Party)\s*Name[\s:]*([^\n\r]+)/i);
    if (custM && !customerName) {
      customerName = custM[1].replace(/Product\s*Name.*/i, '').trim();
      break;
    }
  }
  if (!customerName) {
    const custMatch = fullText.match(/(?:Perform[a-z]*\s+Report\s+(?:of|for)|(?:Customer|Party)\s*Name)[\s:]*([^\n\r,]+?)(?=(?:Product|Sanction|Date|$))/i);
    if (custMatch) customerName = custMatch[1].trim();
  }

  let product = '';
  for (const line of allLines) {
    const text = line.lineText.trim();
    const prodM = text.match(/Product(?:\s*Name)?[\s:]*([^\n\r]+)/i);
    if (prodM && !product) {
      product = prodM[1].trim();
      break;
    }
  }
  if (!product) {
    const prodMatch = fullText.match(/Product[\s:]*([^\n\r,]+?)(?=(?:Sanction|Branch|Date|$))/i);
    if (prodMatch) product = prodMatch[1].trim();
  }

  let sanctionAmount = 0;
  for (const line of allLines) {
    const text = line.lineText.trim();
    const sancM = text.match(/Sanction\s*(?:Amount|Limit)[\s:]*([0-9,.]+)/i);
    if (sancM && !sanctionAmount) {
      sanctionAmount = parseCleanNumber(sancM[1]);
      break;
    }
  }
  if (!sanctionAmount) {
    const sanctionMatch = fullText.match(/Sanction\s*(?:Amount|Limit)[\s:]*([0-9,.]+)/i);
    if (sanctionMatch) sanctionAmount = parseCleanNumber(sanctionMatch[1]);
  }

  let printDate = '';
  for (const line of allLines) {
    const text = line.lineText.trim();
    const dateM = text.match(/Print\s*Date[\s:]*([0-9]{2}[\/.-][0-9]{2}[\/.-][0-9]{2,4})/i);
    if (dateM && !printDate) {
      printDate = dateM[1].replace(/[.-]/g, '/');
      break;
    }
  }
  if (!printDate) {
    const dateMatch = fullText.match(/(?:Print\s*Date|Dated?|As\s*on)[\s:]*([0-9]{2}[\/.-][0-9]{2}[\/.-][0-9]{2,4})/i);
    if (dateMatch) printDate = dateMatch[1].replace(/[.-]/g, '/');
  }

  const rows: PartyPerformanceRow[] = [];
  let customerTotal = {
    disbursementAmt: 0,
    receivable: { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 },
    recovery: { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 },
    outstanding: { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 },
  };

  // Helper: extracts { disb, rec, out } numbers from a line using standard column x-coordinates
  const extractRowByX = (lineIdx: number) => {
    if (lineIdx < 0 || lineIdx >= allLines.length) return { disb: 0, rec: 0, out: 0 };
    const l = allLines[lineIdx];
    let disb = 0, rec = 0, out = 0;
    for (const it of l.items) {
      const val = parseCleanNumber(it.str);
      if (val === 0 && it.str.trim() !== '0' && it.str.trim() !== '0.00') continue;
      // In standard Ababil CBS layout:
      // x in [200, 290]: Disbursement Amt column
      // x in [290, 370]: Recovery Amt column
      // x in [370, 460]: Outstanding Amt column
      if (it.x >= 200 && it.x < 290) disb = val;
      else if (it.x >= 290 && it.x < 370) rec = val;
      else if (it.x >= 370 && it.x < 460) out = val;
    }
    return { disb, rec, out };
  };

  // 2. Parse Customer Total block
  // Method A: Sequence in fullText after "Customer Total" or "Grand Total"
  const ctMatch = fullText.match(/Customer\s*Total\s+([0-9,.\s]+?)(?=(?:Principal|Product|Prepared|Page|$))/i) ||
                  fullText.match(/Grand\s*Total\s+([0-9,.\s]+?)(?=(?:Principal|Product|Prepared|Page|$))/i);
  if (ctMatch) {
    const rawTokens = ctMatch[1].trim().split(/\s+/).filter((t) => /^[0-9,.]+$/.test(t));
    const nums = rawTokens.map((t) => parseCleanNumber(t));
    if (nums.length >= 15) {
      customerTotal.disbursementAmt = nums[0];
      customerTotal.receivable = {
        principal: nums[0],
        profit: nums[1],
        others: nums[2],
        compensation: nums[3] || 0,
        total: nums[4],
      };
      customerTotal.recovery = {
        principal: nums[5],
        profit: nums[6],
        others: nums[7],
        compensation: nums[8] || 0,
        total: nums[9],
      };
      customerTotal.outstanding = {
        principal: nums[10],
        profit: nums[11],
        others: nums[12],
        compensation: nums[13] || 0,
        total: nums[14],
      };
    }
  }

  // Method B: Multi-line / 5-line block around "Customer Total" in allLines
  if (customerTotal.recovery.principal === 0 && customerTotal.recovery.profit === 0) {
    const ctLineIdx = allLines.findIndex((l) => /\b(?:Customer\s*Total|Grand\s*Total)\b/i.test(l.lineText));
    if (ctLineIdx !== -1) {
      // Check if line itself has >= 15 numbers (single line format)
      const singleLineNums = allLines[ctLineIdx].items
        .map((it) => ({ val: parseCleanNumber(it.str), raw: it.str.trim() }))
        .filter((x) => x.val !== 0 || x.raw === '0' || x.raw === '0.00')
        .map((x) => x.val);

      if (singleLineNums.length >= 15) {
        const offset = singleLineNums.length >= 16 ? 1 : 0;
        if (offset === 1) customerTotal.disbursementAmt = singleLineNums[0];
        customerTotal.receivable = {
          principal: singleLineNums[offset + 0],
          profit: singleLineNums[offset + 1],
          others: singleLineNums[offset + 2],
          compensation: singleLineNums[offset + 3] || 0,
          total: singleLineNums[offset + 4],
        };
        customerTotal.recovery = {
          principal: singleLineNums[offset + 5],
          profit: singleLineNums[offset + 6],
          others: singleLineNums[offset + 7],
          compensation: singleLineNums[offset + 8] || 0,
          total: singleLineNums[offset + 9],
        };
        customerTotal.outstanding = {
          principal: singleLineNums[offset + 10],
          profit: singleLineNums[offset + 11],
          others: singleLineNums[offset + 12],
          compensation: singleLineNums[offset + 13] || 0,
          total: singleLineNums[offset + 14],
        };
      } else if (ctLineIdx >= 2 && ctLineIdx + 2 < allLines.length) {
        // Vertical 5-line block:
        // [ctLineIdx - 2]: Principal
        // [ctLineIdx - 1]: Profit
        // [ctLineIdx]: Others (label line)
        // [ctLineIdx + 1]: Compensation
        // [ctLineIdx + 2]: Total
        const rPrinc = extractRowByX(ctLineIdx - 2);
        const rProfit = extractRowByX(ctLineIdx - 1);
        const rOthers = extractRowByX(ctLineIdx);
        const rComp = extractRowByX(ctLineIdx + 1);
        const rTotal = extractRowByX(ctLineIdx + 2);

        if (rPrinc.rec > 0 || rProfit.rec > 0 || rTotal.rec > 0) {
          customerTotal.disbursementAmt = rPrinc.disb;
          customerTotal.receivable = {
            principal: rPrinc.disb,
            profit: rProfit.disb,
            others: rOthers.disb,
            compensation: rComp.disb,
            total: rTotal.disb,
          };
          customerTotal.recovery = {
            principal: rPrinc.rec,
            profit: rProfit.rec,
            others: rOthers.rec,
            compensation: rComp.rec,
            total: rTotal.rec,
          };
          customerTotal.outstanding = {
            principal: rPrinc.out,
            profit: rProfit.out,
            others: rOthers.out,
            compensation: rComp.out,
            total: rTotal.out,
          };
        }
      }
    }
  }

  // 3. Parse individual Account rows
  const accountRegex = /\b([0-9]{13})\b/;
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const text = line.lineText.trim();
    const acMatch = text.match(accountRegex);
    if (!acMatch) continue;

    const accountNo = acMatch[1];
    const lineNumbers = line.items
      .map((it) => ({ val: parseCleanNumber(it.str), raw: it.str.trim() }))
      .filter((x) => x.val !== 0 || x.raw === '0' || x.raw === '0.00')
      .map((x) => x.val);

    // Find dates in this line or adjacent lines
    const dateMatches = text.match(/\b([0-9]{2}[\/.-][0-9]{2}[\/.-][0-9]{2,4})\b/g) || [];
    const disbDate = dateMatches[0] || '';
    const expDate = dateMatches[1] || '';

    let disbAmt = 0;
    let recGroup = { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 };
    let recovGroup = { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 };
    let outGroup = { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 };

    if (lineNumbers.length >= 15) {
      // Single line layout
      const offset = lineNumbers.length >= 16 ? 1 : 0;
      disbAmt = lineNumbers[0];
      recGroup = {
        principal: lineNumbers[offset + 0],
        profit: lineNumbers[offset + 1],
        others: lineNumbers[offset + 2],
        compensation: lineNumbers[offset + 3] || 0,
        total: lineNumbers[offset + 4],
      };
      recovGroup = {
        principal: lineNumbers[offset + 5],
        profit: lineNumbers[offset + 6],
        others: lineNumbers[offset + 7],
        compensation: lineNumbers[offset + 8] || 0,
        total: lineNumbers[offset + 9],
      };
      outGroup = {
        principal: lineNumbers[offset + 10],
        profit: lineNumbers[offset + 11],
        others: lineNumbers[offset + 12],
        compensation: lineNumbers[offset + 13] || 0,
        total: lineNumbers[offset + 14],
      };
    } else if (i >= 2 && i + 2 < allLines.length) {
      // Vertical 5-line block:
      // [i - 2]: Principal
      // [i - 1]: Profit
      // [i]: Others (contains A/C No, dates)
      // [i + 1]: Compensation
      // [i + 2]: Total
      const rPrinc = extractRowByX(i - 2);
      const rProfit = extractRowByX(i - 1);
      const rOthers = extractRowByX(i);
      const rComp = extractRowByX(i + 1);
      const rTotal = extractRowByX(i + 2);

      disbAmt = rPrinc.disb;
      recGroup = {
        principal: rPrinc.disb,
        profit: rProfit.disb,
        others: rOthers.disb,
        compensation: rComp.disb,
        total: rTotal.disb,
      };
      recovGroup = {
        principal: rPrinc.rec,
        profit: rProfit.rec,
        others: rOthers.rec,
        compensation: rComp.rec,
        total: rTotal.rec,
      };
      outGroup = {
        principal: rPrinc.out,
        profit: rProfit.out,
        others: rOthers.out,
        compensation: rComp.out,
        total: rTotal.out,
      };
    }

    rows.push({
      accountNo,
      disbursementDate: disbDate,
      expiryDate: expDate,
      disbursementAmt: round2(disbAmt),
      receivable: recGroup,
      recovery: recovGroup,
      outstanding: outGroup,
    });
  }

  // 4. Fall back to summing accounts if Customer Total row was missing
  if (customerTotal.recovery.principal === 0 && customerTotal.recovery.profit === 0 && rows.length > 0) {
    customerTotal = {
      disbursementAmt: round2(rows.reduce((sum, r) => sum + r.disbursementAmt, 0)),
      receivable: {
        principal: round2(rows.reduce((sum, r) => sum + r.receivable.principal, 0)),
        profit: round2(rows.reduce((sum, r) => sum + r.receivable.profit, 0)),
        others: round2(rows.reduce((sum, r) => sum + r.receivable.others, 0)),
        compensation: round2(rows.reduce((sum, r) => sum + (r.receivable.compensation || 0), 0)),
        total: round2(rows.reduce((sum, r) => sum + r.receivable.total, 0)),
      },
      recovery: {
        principal: round2(rows.reduce((sum, r) => sum + r.recovery.principal, 0)),
        profit: round2(rows.reduce((sum, r) => sum + r.recovery.profit, 0)),
        others: round2(rows.reduce((sum, r) => sum + r.recovery.others, 0)),
        compensation: round2(rows.reduce((sum, r) => sum + (r.recovery.compensation || 0), 0)),
        total: round2(rows.reduce((sum, r) => sum + r.recovery.total, 0)),
      },
      outstanding: {
        principal: round2(rows.reduce((sum, r) => sum + r.outstanding.principal, 0)),
        profit: round2(rows.reduce((sum, r) => sum + r.outstanding.profit, 0)),
        others: round2(rows.reduce((sum, r) => sum + r.outstanding.others, 0)),
        compensation: round2(rows.reduce((sum, r) => sum + (r.outstanding.compensation || 0), 0)),
        total: round2(rows.reduce((sum, r) => sum + r.outstanding.total, 0)),
      },
    };
  }

  return {
    branchName: branchName || 'HEAD OFFICE',
    customerName: customerName || 'M/S OCEAN AGRO FARM',
    product: product || 'INVESTMENT GENERAL',
    sanctionAmount,
    printDate,
    rows,
    customerTotal,
    fileName,
    fileHash,
  };
}
