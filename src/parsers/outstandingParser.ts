/**
 * Parser for Customer Outstanding Report.
 * Extracts per-account outstanding CBS balances, CL statuses, and grand totals.
 */

import { OutstandingReport, OutstandingRow } from '../types';
import { parseCleanNumber, round2 } from '../utils/numberUtils';
import { groupItemsIntoLines } from './ledgerParser';
import { ExtractedPdfDocument } from './pdfTextExtractor';

export function parseOutstandingReport(
  pdfDoc: ExtractedPdfDocument,
  fileName: string,
  fileHash: string
): OutstandingReport {
  const fullText = pdfDoc.fullText;

  // Header: CIS ID, Customer Name, Print Date
  const cisMatch = fullText.match(/CIS\s*(?:ID|No\.?)[\s:]*([A-Za-z0-9-]+)/i);
  const cisId = cisMatch ? cisMatch[1].trim() : '';

  const custMatch = fullText.match(/Customer\s*Name[\s:]*([^\n\r,]+?)(?=(?:Branch|Print|CIS|Date|$))/i);
  const customerName = custMatch ? custMatch[1].trim() : '';

  const dateMatch = fullText.match(/(?:Print\s*Date|Dated?|As\s*on)[\s:]*([0-9]{2}[\/.-][0-9]{2}[\/.-][0-9]{4})/i);
  const printDate = dateMatch ? dateMatch[1].replace(/[.-]/g, '/') : '';

  // Extract table rows across all pages
  const rows: OutstandingRow[] = [];
  let grandTotal = {
    disburse: 0,
    princOut: 0,
    profitOut: 0,
    compensation: 0,
    unappliedPro: 0,
    charge: 0,
    rebate: 0,
    netOut: 0,
  };

  const accountRegex = /\b([0-9]{13})\b/;

  for (const page of pdfDoc.pages) {
    const lines = groupItemsIntoLines(page.items);

    for (const line of lines) {
      const text = line.lineText.trim();

      // Check Grand Total row
      if (/\b(?:Grand\s*Total|Total)\b/i.test(text) && !accountRegex.test(text)) {
        const tokens: number[] = [];
        for (const it of line.items) {
          const s = it.str.trim();
          if (s === '-' || s === '--') {
            tokens.push(0);
          } else {
            const val = parseCleanNumber(s);
            if (!isNaN(val) && (val !== 0 || s === '0' || s === '0.00')) {
              tokens.push(val);
            }
          }
        }

        if (tokens.length >= 7) {
          // If 9 tokens: Disburse, Rate, Princ Out, Profit Out, Compensation, Unapplied Pro, Charge, Rebate, Net Out
          // If 8 tokens: Disburse, Princ Out, Profit Out, Compensation, Unapplied Pro, Charge, Rebate, Net Out
          // If 7 tokens: Disburse, Princ Out, Profit Out, Compensation, Unapplied Pro, Charge, Net Out
          let offset = 0;
          if (tokens.length >= 9) {
            offset = 1; // skip rate
          }
          grandTotal = {
            disburse: tokens[0] || 0,
            princOut: tokens[offset + 1] || 0,
            profitOut: tokens[offset + 2] || 0,
            compensation: tokens[offset + 3] || 0,
            unappliedPro: tokens[offset + 4] || 0,
            charge: tokens[offset + 5] || 0,
            rebate: tokens.length >= 8 ? (offset === 1 ? tokens[7] : tokens[6]) : 0,
            netOut: tokens[tokens.length - 1] || 0,
          };
        }
        continue;
      }

      // Check if line contains a 13-digit account number
      const acMatch = text.match(accountRegex);
      if (!acMatch) {
        continue;
      }

      const accountNo = acMatch[1];

      // Extract tokens
      const items = line.items.map((it) => it.str.trim()).filter((s) => s.length > 0);
      const acIndex = items.findIndex((it) => it === accountNo || it.includes(accountNo));

      // Status (e.g. BL, SMA, STD, DF)
      let status = 'BL';
      for (let i = acIndex + 1; i < Math.min(acIndex + 4, items.length); i++) {
        if (/^(BL|DF|SS|SMA|STD|UC|ST)$/i.test(items[i])) {
          status = items[i].toUpperCase();
          break;
        }
      }

      // Collect numeric values from line after the account number
      const numbers: number[] = [];
      for (let i = acIndex + 1; i < items.length; i++) {
        const val = parseCleanNumber(items[i]);
        if (!isNaN(val) && (val !== 0 || items[i] === '0' || items[i] === '0.00' || items[i] === '-')) {
          numbers.push(val);
        }
      }

      // Columns: Disburse, Rate, Princ Out, Profit Out, Compensation, Unapplied Pro, Charge, Rebate, NET Out
      let disburse = 0;
      let rate = 0;
      let princOut = 0;
      let profitOut = 0;
      let compensation = 0;
      let unappliedPro = 0;
      let charge = 0;
      let rebate = 0;
      let netOut = 0;

      if (numbers.length >= 9) {
        disburse = numbers[0];
        rate = numbers[1];
        princOut = numbers[2];
        profitOut = numbers[3];
        compensation = numbers[4];
        unappliedPro = numbers[5];
        charge = numbers[6];
        rebate = numbers[7];
        netOut = numbers[8];
      } else if (numbers.length >= 7) {
        // Fallback without rebate/rate
        disburse = numbers[0];
        princOut = numbers[1];
        profitOut = numbers[2];
        compensation = numbers[3];
        unappliedPro = numbers[4];
        charge = numbers[5];
        netOut = numbers[6];
      }

      rows.push({
        sl: rows.length + 1,
        accountNo,
        status,
        type: 'MPI',
        openDate: '',
        expireDate: '',
        disburse: round2(disburse),
        rate: round2(rate),
        princOut: round2(princOut),
        profitOut: round2(profitOut),
        compensation: round2(compensation),
        unappliedPro: round2(unappliedPro),
        charge: round2(charge),
        rebate: round2(rebate),
        netOut: round2(netOut),
      });
    }
  }

  const sumPrincOut = round2(rows.reduce((sum, r) => sum + r.princOut, 0));
  const sumProfitOut = round2(rows.reduce((sum, r) => sum + r.profitOut, 0));
  const sumCompensation = round2(rows.reduce((sum, r) => sum + r.compensation, 0));
  const sumUnappliedPro = round2(rows.reduce((sum, r) => sum + r.unappliedPro, 0));
  const sumCharge = round2(rows.reduce((sum, r) => sum + r.charge, 0));

  // Calculate grand total from rows if missing
  if (grandTotal.princOut === 0 && rows.length > 0) {
    grandTotal = {
      disburse: round2(rows.reduce((sum, r) => sum + r.disburse, 0)),
      princOut: sumPrincOut,
      profitOut: sumProfitOut,
      compensation: sumCompensation,
      unappliedPro: sumUnappliedPro,
      charge: sumCharge,
      rebate: round2(rows.reduce((sum, r) => sum + r.rebate, 0)),
      netOut: round2(rows.reduce((sum, r) => sum + r.netOut, 0)),
    };
  }

  const diffPrincOut = round2(Math.abs(grandTotal.princOut - sumPrincOut));

  return {
    cisId,
    customerName,
    printDate,
    rows,
    grandTotal,
    reconciliation: {
      isReconciled: diffPrincOut <= 0.05,
      sumPrincOut,
      diffPrincOut,
      sumProfitOut,
      sumCompensation,
      sumUnappliedPro,
      sumCharge,
    },
    fileName,
    fileHash,
  };
}
