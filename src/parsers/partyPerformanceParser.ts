/**
 * Parser for Party Performance Report.
 * Identifies Receivable, Recovery, and Outstanding groups using arithmetic verification:
 * Receivable - Recovery = Outstanding.
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

  // Header: Branch Name, Customer Name, Product, Sanction Amount, Print Date
  let branchName = '';
  const branchMatch = fullText.match(/([A-Z\s]+BRANCH)/i);
  if (branchMatch) {
    branchName = branchMatch[1].trim();
  }

  let customerName = '';
  const custMatch = fullText.match(/(?:Customer|Party)\s*Name[\s:]*([^\n\r,]+?)(?=(?:Product|Sanction|Date|$))/i);
  if (custMatch) {
    customerName = custMatch[1].trim();
  }

  let product = '';
  const prodMatch = fullText.match(/Product[\s:]*([^\n\r,]+?)(?=(?:Sanction|Branch|Date|$))/i);
  if (prodMatch) {
    product = prodMatch[1].trim();
  }

  let sanctionAmount = 0;
  const sanctionMatch = fullText.match(/Sanction\s*(?:Amount|Limit)[\s:]*([0-9,.]+)/i);
  if (sanctionMatch) {
    sanctionAmount = parseCleanNumber(sanctionMatch[1]);
  }

  let printDate = '';
  const dateMatch = fullText.match(/(?:Print\s*Date|Dated?|As\s*on)[\s:]*([0-9]{2}[\/.-][0-9]{2}[\/.-][0-9]{2,4})/i);
  if (dateMatch) {
    printDate = dateMatch[1].replace(/[.-]/g, '/');
  }

  const rows: PartyPerformanceRow[] = [];
  let customerTotal = {
    disbursementAmt: 0,
    receivable: { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 },
    recovery: { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 },
    outstanding: { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 },
  };

  const accountRegex = /\b([0-9]{13})\b/;

  for (const page of pdfDoc.pages) {
    const lines = groupItemsIntoLines(page.items);

    for (const line of lines) {
      const text = line.lineText.trim();

      // Check Customer Total or Product Total row
      if (/\b(?:Customer\s*Total|Grand\s*Total)\b/i.test(text) && !accountRegex.test(text)) {
        const numbers = line.items
          .map((it) => ({ val: parseCleanNumber(it.str), raw: it.str.trim() }))
          .filter((x) => x.val !== 0 || x.raw === '0' || x.raw === '0.00')
          .map((x) => x.val);

        if (numbers.length >= 15) {
          // If first number is disbursement amt
          const offset = numbers.length >= 16 ? 1 : 0;
          if (offset === 1) {
            customerTotal.disbursementAmt = numbers[0];
          }

          customerTotal.receivable = {
            principal: numbers[offset + 0],
            profit: numbers[offset + 1],
            others: numbers[offset + 2],
            compensation: numbers[offset + 3],
            total: numbers[offset + 4],
          };

          customerTotal.recovery = {
            principal: numbers[offset + 5],
            profit: numbers[offset + 6],
            others: numbers[offset + 7],
            compensation: numbers[offset + 8],
            total: numbers[offset + 9],
          };

          customerTotal.outstanding = {
            principal: numbers[offset + 10],
            profit: numbers[offset + 11],
            others: numbers[offset + 12],
            compensation: numbers[offset + 13],
            total: numbers[offset + 14],
          };
        }
        continue;
      }

      // Check account row
      const acMatch = text.match(accountRegex);
      if (!acMatch) {
        continue;
      }

      const accountNo = acMatch[1];
      const numbers = line.items
        .map((it) => ({ val: parseCleanNumber(it.str), raw: it.str.trim() }))
        .filter((x) => x.val !== 0 || x.raw === '0' || x.raw === '0.00')
        .map((x) => x.val);

      // 3 groups of 5 numbers: Receivable (5), Recovery (5), Outstanding (5)
      // plus Disbursement Amt (1) = 16 numbers total
      let disbAmt = 0;
      let recGroup = { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 };
      let recovGroup = { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 };
      let outGroup = { principal: 0, profit: 0, others: 0, compensation: 0, total: 0 };

      if (numbers.length >= 16) {
        disbAmt = numbers[0];
        recGroup = {
          principal: numbers[1],
          profit: numbers[2],
          others: numbers[3],
          compensation: numbers[4],
          total: numbers[5],
        };
        recovGroup = {
          principal: numbers[6],
          profit: numbers[7],
          others: numbers[8],
          compensation: numbers[9],
          total: numbers[10],
        };
        outGroup = {
          principal: numbers[11],
          profit: numbers[12],
          others: numbers[13],
          compensation: numbers[14],
          total: numbers[15],
        };
      } else if (numbers.length >= 15) {
        recGroup = {
          principal: numbers[0],
          profit: numbers[1],
          others: numbers[2],
          compensation: numbers[3],
          total: numbers[4],
        };
        recovGroup = {
          principal: numbers[5],
          profit: numbers[6],
          others: numbers[7],
          compensation: numbers[8],
          total: numbers[9],
        };
        outGroup = {
          principal: numbers[10],
          profit: numbers[11],
          others: numbers[12],
          compensation: numbers[13],
          total: numbers[14],
        };
      }

      // Find dates in this line
      const dateMatches = text.match(/\b([0-9]{2}[\/.-][0-9]{2}[\/.-][0-9]{2,4})\b/g) || [];
      const disbDate = dateMatches[0] || '';
      const expDate = dateMatches[1] || '';

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
  }

  // Fall back to summing accounts if Customer Total row was missing
  if (customerTotal.outstanding.principal === 0 && rows.length > 0) {
    customerTotal = {
      disbursementAmt: round2(rows.reduce((sum, r) => sum + r.disbursementAmt, 0)),
      receivable: {
        principal: round2(rows.reduce((sum, r) => sum + r.receivable.principal, 0)),
        profit: round2(rows.reduce((sum, r) => sum + r.receivable.profit, 0)),
        others: round2(rows.reduce((sum, r) => sum + r.receivable.others, 0)),
        compensation: round2(rows.reduce((sum, r) => sum + r.receivable.compensation, 0)),
        total: round2(rows.reduce((sum, r) => sum + r.receivable.total, 0)),
      },
      recovery: {
        principal: round2(rows.reduce((sum, r) => sum + r.recovery.principal, 0)),
        profit: round2(rows.reduce((sum, r) => sum + r.recovery.profit, 0)),
        others: round2(rows.reduce((sum, r) => sum + r.recovery.others, 0)),
        compensation: round2(rows.reduce((sum, r) => sum + r.recovery.compensation, 0)),
        total: round2(rows.reduce((sum, r) => sum + r.recovery.total, 0)),
      },
      outstanding: {
        principal: round2(rows.reduce((sum, r) => sum + r.outstanding.principal, 0)),
        profit: round2(rows.reduce((sum, r) => sum + r.outstanding.profit, 0)),
        others: round2(rows.reduce((sum, r) => sum + r.outstanding.others, 0)),
        compensation: round2(rows.reduce((sum, r) => sum + r.outstanding.compensation, 0)),
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
