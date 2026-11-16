/**
 * High-precision Excel Generation with Live Formulas using ExcelJS.
 * Dynamically loaded only when user clicks Export.
 */

import {
  CofCalculationResult,
  ManualInputs,
  RateYear,
  SummaryCalculationResult,
} from '../types';
import {
  formatSettlementSummaryDates,
  parseDateToExcelDate,
} from '../utils/dateUtils';

// Standard Excel recognized date format
const EXCEL_DATE_FORMAT = 'dd/mm/yyyy';
// Currency format for COF table
const COF_CURRENCY_FORMAT = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)';
// Millions display format for Summary sheet
const MILLION_BDT_FORMAT = '#,##0.0000,,';

const THIN_BORDER = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
};

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates and downloads Cost_of_Fund.xlsx
 */
export async function exportCofExcel(
  cofResult: CofCalculationResult,
  rateTable: RateYear[],
  manual: ManualInputs
): Promise<void> {
  // Dynamic import of exceljs as requested
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Special Asset Management';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Calculation of COF (2)', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Set column widths
  sheet.columns = [
    { key: 'A', width: 8 }, // Serial No
    { key: 'B', width: 17 }, // Account No
    { key: 'C', width: 14 }, // Disbursment Date
    { key: 'D', width: 14 }, // Adjustment Date
    { key: 'E', width: 14 }, // Effective Days
    { key: 'F', width: 20 }, // Principal
    { key: 'G', width: 18 }, // Rate of Cost of Fund
    { key: 'H', width: 18 }, // Time Period (In Year)
    { key: 'I', width: 20 }, // Cost of Fund
    { key: 'J', width: 3 },
    { key: 'K', width: 3 },
    { key: 'L', width: 10 }, // Rate Table: Year
    { key: 'M', width: 12 }, // Rate Table: Rate
  ];

  // Header Rows A1 - A3
  const bankName = manual.bankLine1 || 'Union Bank PLC.';
  const clientUpper = (manual.clientName || 'CLIENT NAME').toUpperCase();
  const branchName = manual.branchName || 'Branch';
  const clStatus = manual.clStatus || 'BL';
  const asOnDate = cofResult.calculationUpToDate || '11/11/2026';

  // Row 1: Bank Name
  sheet.mergeCells('A1:I1');
  const cellA1 = sheet.getCell('A1');
  cellA1.value = bankName;
  cellA1.font = { name: 'Times New Roman', size: 16, bold: true };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 24;

  // Row 2: Client Info & Branch
  sheet.mergeCells('A2:I2');
  const cellA2 = sheet.getCell('A2');
  cellA2.value = `${clientUpper} (CL Status: ${clStatus}) – ${branchName}`;
  cellA2.font = { name: 'Times New Roman', size: 14, bold: true };
  cellA2.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 22;

  // Row 3: Cost of Fund as on
  sheet.mergeCells('A3:I3');
  const cellA3 = sheet.getCell('A3');
  cellA3.value = `Cost of Fund (as on ${asOnDate.replace(/\//g, '.')})`;
  cellA3.font = { name: 'Times New Roman', size: 13, bold: true };
  cellA3.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 20;

  // Row 4: Table Headers
  const headers = [
    'Serial No',
    'Account No',
    'Disbursment Date',
    'Adjustment Date',
    'Effective Days',
    'Principal',
    'Rate of Cost of Fund',
    'Time Period (In Year)',
    'Cost of Fund',
  ];

  const headerRow = sheet.getRow(4);
  headerRow.height = 28;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Times New Roman', size: 11, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEFEFEF' },
    };
  });

  // Also Rate reference headers in L4:M4
  const cellL4 = sheet.getCell('L4');
  cellL4.value = 'Year';
  cellL4.font = { name: 'Times New Roman', size: 11, bold: true };
  cellL4.alignment = { horizontal: 'center', vertical: 'middle' };
  cellL4.border = THIN_BORDER;

  const cellM4 = sheet.getCell('M4');
  cellM4.value = 'Rate';
  cellM4.font = { name: 'Times New Roman', size: 11, bold: true };
  cellM4.alignment = { horizontal: 'center', vertical: 'middle' };
  cellM4.border = THIN_BORDER;

  // Populate Rate Table in L:M
  rateTable.forEach((rt, idx) => {
    const rIdx = 5 + idx;
    const yCell = sheet.getCell(`L${rIdx}`);
    yCell.value = rt.year;
    yCell.font = { name: 'Times New Roman', size: 10 };
    yCell.alignment = { horizontal: 'center' };
    yCell.border = THIN_BORDER;

    const rCell = sheet.getCell(`M${rIdx}`);
    rCell.value = rt.rate;
    rCell.font = { name: 'Times New Roman', size: 10 };
    rCell.alignment = { horizontal: 'right' };
    rCell.numFmt = '0.00%';
    rCell.border = THIN_BORDER;
  });

  // Populate segments from row 5
  let currentRow = 5;
  const startRow = 5;

  for (const acc of cofResult.accountSummaries) {
    const accStartRow = currentRow;
    const accSegments = acc.segments;

    if (accSegments.length === 0) continue;

    for (const seg of accSegments) {
      const row = sheet.getRow(currentRow);
      row.height = 20;

      // C: Start Date (Disbursment Date) - Stored as genuine Excel Date value
      const cCell = row.getCell(3);
      cCell.value = parseDateToExcelDate(seg.startUtcDay);
      cCell.numFmt = EXCEL_DATE_FORMAT;
      cCell.alignment = { horizontal: 'center' };
      cCell.font = { name: 'Times New Roman', size: 11 };
      cCell.border = THIN_BORDER;

      // D: End Date (Adjustment Date) - Stored as genuine Excel Date value
      const dCell = row.getCell(4);
      dCell.value = parseDateToExcelDate(seg.endUtcDay);
      dCell.numFmt = EXCEL_DATE_FORMAT;
      dCell.alignment = { horizontal: 'center' };
      dCell.font = { name: 'Times New Roman', size: 11 };
      dCell.border = THIN_BORDER;

      // E: Effective Days formula =D{r}-C{r}+1 (with fallback value)
      const eCell = row.getCell(5);
      eCell.value = {
        formula: `D${currentRow}-C${currentRow}+1`,
        result: seg.effectiveDays,
      };
      eCell.alignment = { horizontal: 'center' };
      eCell.font = { name: 'Times New Roman', size: 11 };
      eCell.numFmt = '#,##0';
      eCell.border = THIN_BORDER;

      // F: Principal
      const fCell = row.getCell(6);
      fCell.value = seg.principal;
      fCell.alignment = { horizontal: 'right' };
      fCell.font = { name: 'Times New Roman', size: 11 };
      fCell.numFmt = COF_CURRENCY_FORMAT;
      fCell.border = THIN_BORDER;

      // G: Rate of Cost of Fund
      const gCell = row.getCell(7);
      gCell.value = seg.rate;
      gCell.alignment = { horizontal: 'center' };
      gCell.font = { name: 'Times New Roman', size: 11 };
      gCell.numFmt = '0.00';
      gCell.border = THIN_BORDER;

      // H: Time Period (In Year) = E{r}/365
      const hCell = row.getCell(8);
      hCell.value = {
        formula: `E${currentRow}/365`,
        result: seg.timePeriodYears,
      };
      hCell.alignment = { horizontal: 'right' };
      hCell.font = { name: 'Times New Roman', size: 11 };
      hCell.numFmt = '0.00';
      hCell.border = THIN_BORDER;

      // I: Cost of Fund = F{r}*G{r}*H{r}/100
      const iCell = row.getCell(9);
      iCell.value = {
        formula: `F${currentRow}*G${currentRow}*H${currentRow}/100`,
        result: seg.cofAmount,
      };
      iCell.alignment = { horizontal: 'right' };
      iCell.font = { name: 'Times New Roman', size: 11 };
      iCell.numFmt = COF_CURRENCY_FORMAT;
      iCell.border = THIN_BORDER;

      currentRow++;
    }

    const accEndRow = currentRow - 1;

    // Merge A and B across this account's rows
    if (accEndRow >= accStartRow) {
      if (accEndRow > accStartRow) {
        sheet.mergeCells(`A${accStartRow}:A${accEndRow}`);
        sheet.mergeCells(`B${accStartRow}:B${accEndRow}`);
      }
      const aCell = sheet.getCell(`A${accStartRow}`);
      aCell.value = cofResult.accountSummaries.indexOf(acc) + 1;
      aCell.alignment = { horizontal: 'center', vertical: 'middle' };
      aCell.font = { name: 'Times New Roman', size: 11 };
      aCell.border = THIN_BORDER;

      const bCell = sheet.getCell(`B${accStartRow}`);
      bCell.value = acc.accountNo;
      bCell.alignment = { horizontal: 'center', vertical: 'middle' };
      bCell.font = { name: 'Times New Roman', size: 11 };
      bCell.numFmt = '@'; // Stored as text with leading zeros
      bCell.border = THIN_BORDER;
    }
  }

  const lastDataRow = currentRow - 1;

  // After last row:
  // Row X: "Total" in A, "Cost of Fund" in H, I: =SUM(I5:I{lastRow})
  const totalRow1 = sheet.getRow(currentRow);
  totalRow1.height = 22;

  totalRow1.getCell(1).value = 'Total';
  totalRow1.getCell(1).font = { name: 'Times New Roman', size: 11, bold: true };
  totalRow1.getCell(1).alignment = { horizontal: 'center' };
  totalRow1.getCell(1).border = THIN_BORDER;

  for (let c = 2; c <= 7; c++) {
    totalRow1.getCell(c).border = THIN_BORDER;
  }

  totalRow1.getCell(8).value = 'Cost of Fund';
  totalRow1.getCell(8).font = { name: 'Times New Roman', size: 11, bold: true };
  totalRow1.getCell(8).alignment = { horizontal: 'center' };
  totalRow1.getCell(8).border = THIN_BORDER;

  const totalCellI1 = totalRow1.getCell(9);
  totalCellI1.value = {
    formula: `SUM(I${startRow}:I${lastDataRow})`,
    result: cofResult.totalCof,
  };
  totalCellI1.font = { name: 'Times New Roman', size: 11, bold: true };
  totalCellI1.numFmt = COF_CURRENCY_FORMAT;
  totalCellI1.alignment = { horizontal: 'right' };
  totalCellI1.border = THIN_BORDER;

  currentRow++;

  // Next row X+1: "Total" in G and I = total again
  const totalRow2 = sheet.getRow(currentRow);
  totalRow2.height = 22;
  totalRow2.getCell(7).value = 'Total';
  totalRow2.getCell(7).font = { name: 'Times New Roman', size: 11, bold: true };
  totalRow2.getCell(7).alignment = { horizontal: 'center' };
  totalRow2.getCell(7).border = THIN_BORDER;

  const totalCellI2 = totalRow2.getCell(9);
  totalCellI2.value = {
    formula: `I${currentRow - 1}`,
    result: cofResult.totalCof,
  };
  totalCellI2.font = { name: 'Times New Roman', size: 11, bold: true };
  totalCellI2.numFmt = COF_CURRENCY_FORMAT;
  totalCellI2.alignment = { horizontal: 'right' };
  totalCellI2.border = THIN_BORDER;

  currentRow += 2;

  // Note row
  const noteRow = sheet.getRow(currentRow);
  sheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const noteCell = noteRow.getCell(1);
  noteCell.value = cofResult.noteText;
  noteCell.font = { name: 'Times New Roman', size: 10, italic: true };
  noteCell.alignment = { horizontal: 'left', wrapText: true };
  currentRow += 2;

  // Notes block:
  // "Notes:"
  // "Cost of Fund" = total
  // "Total already realized (Profit + Compensation)" = formula =profit+compensation
  // "Surpluse/Deficit of realization over cost of fund" = difference (bold)
  const notesHeaderRow = sheet.getRow(currentRow);
  notesHeaderRow.getCell(1).value = 'Notes:';
  notesHeaderRow.getCell(1).font = { name: 'Times New Roman', size: 11, bold: true };
  currentRow++;

  // Cost of Fund
  const nbCofRow = sheet.getRow(currentRow);
  sheet.mergeCells(`B${currentRow}:F${currentRow}`);
  nbCofRow.getCell(2).value = 'Cost of Fund';
  nbCofRow.getCell(2).font = { name: 'Times New Roman', size: 11 };
  const cofValCell = nbCofRow.getCell(9);
  cofValCell.value = {
    formula: `I${lastDataRow + 1}`,
    result: cofResult.totalCof,
  };
  cofValCell.font = { name: 'Times New Roman', size: 11 };
  cofValCell.numFmt = COF_CURRENCY_FORMAT;
  cofValCell.alignment = { horizontal: 'right' };
  currentRow++;

  // Total already realized
  const nbRealizedRow = sheet.getRow(currentRow);
  sheet.mergeCells(`B${currentRow}:F${currentRow}`);
  nbRealizedRow.getCell(2).value = 'Total already realized (Profit + Compensation)';
  nbRealizedRow.getCell(2).font = { name: 'Times New Roman', size: 11 };
  const realizedValCell = nbRealizedRow.getCell(9);
  realizedValCell.value = {
    formula: `${cofResult.profitRecovery}+${cofResult.compensationRecovery}`,
    result: cofResult.totalAlreadyRealized,
  };
  realizedValCell.font = { name: 'Times New Roman', size: 11 };
  realizedValCell.numFmt = COF_CURRENCY_FORMAT;
  realizedValCell.alignment = { horizontal: 'right' };
  currentRow++;

  // Surpluse/Deficit of realization over cost of fund
  const nbDiffRow = sheet.getRow(currentRow);
  sheet.mergeCells(`B${currentRow}:F${currentRow}`);
  nbDiffRow.getCell(2).value = 'Surpluse/Deficit of realization over cost of fund';
  nbDiffRow.getCell(2).font = { name: 'Times New Roman', size: 11, bold: true };
  const diffValCell = nbDiffRow.getCell(9);
  diffValCell.value = {
    formula: `I${currentRow - 2}-I${currentRow - 1}`,
    result: cofResult.surplusDeficit,
  };
  diffValCell.font = { name: 'Times New Roman', size: 11, bold: true };
  diffValCell.numFmt = COF_CURRENCY_FORMAT;
  diffValCell.alignment = { horizontal: 'right' };

  // Write and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, 'Cost_of_Fund.xlsx');
}

async function loadImageBase64(
  customDataUrl: string | null | undefined,
  fallbackPublicPath: string
): Promise<{ base64: string; extension: 'jpeg' | 'png' } | null> {
  if (customDataUrl && customDataUrl.startsWith('data:image')) {
    const match = customDataUrl.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (match) {
      const ext = match[1] === 'jpeg' || match[1] === 'jpg' ? 'jpeg' : 'png';
      return { base64: customDataUrl, extension: ext };
    }
  }
  try {
    const res = await fetch(fallbackPublicPath);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    return { base64: `data:image/png;base64,${b64}`, extension: 'png' };
  } catch {
    return null;
  }
}

/**
 * Generates and downloads Summary.xlsx
 */
export async function exportSummaryExcel(
  summaryResult: SummaryCalculationResult,
  _cofResult: CofCalculationResult,
  manual: ManualInputs,
  calculationUpToDate?: string
): Promise<void> {
  const stripUnwantedSummaryText = (val: string | null | undefined): string => {
    if (!val) return '';
    return val
      .replace(/No\.?\s+Account\s+No\.?\s+Status\.?\s+Type\s+Open/gi, '')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  };

  const rawUpToDate =
    calculationUpToDate !== undefined ? calculationUpToDate : manual.calculationUpToDate;
  const summaryDates = formatSettlementSummaryDates(
    stripUnwantedSummaryText(rawUpToDate)
  );

  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Special Asset Management';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Enigma Summary', {
    views: [{ showGridLines: false }],
    pageSetup: {
      // Default US Letter (8.5 x 11 in, 612pt x 792pt) matching reference
      orientation: 'portrait',
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.55,
        right: 0.55,
        top: 0.15,
        bottom: 0.5,
        header: 0.1,
        footer: 0.2,
      },
    },
  });

  // Setup equal 3-column table layout across C:P (C:F = SL, G:K = Particular, L:P = Amount)
  sheet.getColumn(1).width = 1;
  sheet.getColumn(2).width = 1;
  for (let c = 3; c <= 6; c++) {
    sheet.getColumn(c).width = 7.875; // 4 cols * 7.875 = 31.5
  }
  for (let c = 7; c <= 16; c++) {
    sheet.getColumn(c).width = 6.3; // 5 cols * 6.3 = 31.5 per group (G:K & L:P)
  }

  const headerFill = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFD9E2F3' },
  };

  // Embed Bismillah Image and Bank Logo (custom upload or exact reference assets)
  const [bismillahImg, bankLogoImg] = await Promise.all([
    loadImageBase64(manual.bismillahImage, '/assets/bismillah_ref.png'),
    loadImageBase64(manual.bankLogo, '/assets/bank_logo_ref.png'),
  ]);

  if (bismillahImg) {
    try {
      const bismillahId = workbook.addImage({
        base64: bismillahImg.base64,
        extension: bismillahImg.extension,
      });
      sheet.addImage(bismillahId, {
        tl: { col: 6.7, row: 0.15 },
        ext: { width: 218, height: 27 },
      });
    } catch {
      // ignore image embedding failure if format unsupported
    }
  }

  if (bankLogoImg) {
    try {
      const logoId = workbook.addImage({
        base64: bankLogoImg.base64,
        extension: bankLogoImg.extension,
      });
      sheet.addImage(logoId, {
        tl: { col: 2.0, row: 1.2 },
        ext: { width: 77, height: 87 },
      });
    } catch {
      // ignore image embedding failure if format unsupported
    }
  }

  // Row heights for top header block
  sheet.getRow(1).height = 14;
  sheet.getRow(2).height = 14;
  sheet.getRow(3).height = 6;

  // Bank Header (F4:N4, F5:N5, F6:N6, F7:N7) in #17365D
  const bankLines = [
    manual.bankLine1 ? stripUnwantedSummaryText(manual.bankLine1) : 'SAMMILITO ISLAMI BANK PLC.',
    manual.bankLine2 ? stripUnwantedSummaryText(manual.bankLine2) : '(State-owned Shariah-based Bank)',
    manual.bankLine3 ? stripUnwantedSummaryText(manual.bankLine3) : 'UNION BANK UNIT',
    manual.bankLine4 ? stripUnwantedSummaryText(manual.bankLine4) : 'Special Assets Management Division',
  ];

  bankLines.forEach((text, i) => {
    const r = 4 + i;
    sheet.getRow(r).height = i <= 1 ? 17 : 15;
    sheet.mergeCells(`F${r}:N${r}`);
    const cell = sheet.getCell(`F${r}`);
    cell.value = text;
    cell.font = {
      name: i === 1 ? 'Bell MT' : 'Calibri',
      size: i === 0 ? 12 : i === 1 ? 13 : 11,
      bold: i <= 1,
      color: { argb: 'FF17365D' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Row 8: Horizontal blue divider line (#4F81BD) across C8:P8
  sheet.getRow(8).height = 6;
  for (let c = 3; c <= 16; c++) {
    sheet.getRow(8).getCell(c).border = {
      bottom: { style: 'medium', color: { argb: 'FF4F81BD' } },
    };
  }

  // Row 9: Branch Name (C9:K9) and Date (L9:P9)
  sheet.mergeCells('C9:K9');
  const cellC9 = sheet.getCell('C9');
  cellC9.value = `Branch Name: ${manual.branchName ? stripUnwantedSummaryText(manual.branchName) : 'EIDGAON BRANCH'}`;
  cellC9.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } };

  sheet.mergeCells('L9:P9');
  const cellL9 = sheet.getCell('L9');
  cellL9.value = summaryDates ? `Date:${summaryDates.slashDate}` : 'Date:';
  cellL9.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } };
  cellL9.alignment = { horizontal: 'right' };

  // Row 10: Client Name
  sheet.mergeCells('C10:P10');
  const cellC10 = sheet.getCell('C10');
  cellC10.value = `Client Name: ${manual.clientName ? stripUnwantedSummaryText(manual.clientName) : 'M/S OCEAN AGRO FARM'}`;
  cellC10.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } };

  // Row 11: Managing Director
  sheet.mergeCells('C11:P11');
  const cellC11 = sheet.getCell('C11');
  cellC11.value = `Managing Director: ${stripUnwantedSummaryText(manual.managingDirectorName) || '-'}`;
  cellC11.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } };

  // Row 12: Figure in Million BDT
  sheet.mergeCells('L12:P12');
  const cellL12 = sheet.getCell('L12');
  cellL12.value = 'Figure in Million BDT';
  cellL12.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } };
  cellL12.alignment = { horizontal: 'right' };

  // Helper to format table row
  const applyTableBorder = (r: number, startCol = 3, endCol = 16) => {
    for (let c = startCol; c <= endCol; c++) {
      sheet.getRow(r).getCell(c).border = THIN_BORDER;
    }
  };

  // SECTION A: Liability Position
  sheet.mergeCells('C13:P13');
  const cellAHeader = sheet.getCell('C13');
  cellAHeader.value = summaryDates
    ? `A) Liability Position as per CBS (Dated on ${summaryDates.dotDate})`
    : 'A) Liability Position as per CBS';
  cellAHeader.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  cellAHeader.fill = headerFill;
  cellAHeader.alignment = { horizontal: 'left', vertical: 'middle' };
  applyTableBorder(13);

  // Headers (Row 14)
  sheet.mergeCells('C14:F14');
  sheet.getCell('C14').value = 'SL';
  sheet.getCell('C14').alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('G14:K14');
  sheet.getCell('G14').value = 'Particular';
  sheet.getCell('G14').alignment = { horizontal: 'left', vertical: 'middle' };

  sheet.mergeCells('L14:P14');
  sheet.getCell('L14').value = 'Amount';
  sheet.getCell('L14').alignment = { horizontal: 'center', vertical: 'middle' };
  applyTableBorder(14);
  ['C14', 'G14', 'L14'].forEach((pos) => {
    sheet.getCell(pos).font = { name: 'Arial', size: 8.5, bold: false, color: { argb: 'FF000000' } };
  });

  // Rows 15-21
  const liabilityRows = [
    { sl: 1, name: 'Principal', val: summaryResult.liability.principal },
    { sl: 2, name: 'Charged Profit', val: summaryResult.liability.chargedProfit },
    { sl: 3, name: 'Gestation Rent', val: 0 },
    { sl: 4, name: 'Charges (Legal & Others)', val: summaryResult.liability.charges },
    { sl: 5, name: 'Compensation', val: summaryResult.liability.compensation },
    { sl: 6, name: 'Uncharged Compensation', val: summaryResult.liability.unchargedCompensation },
    { sl: 7, name: 'Uncharged Profit', val: 0 },
  ];

  liabilityRows.forEach((item, idx) => {
    const r = 15 + idx;
    sheet.mergeCells(`C${r}:F${r}`);
    sheet.getCell(`C${r}`).value = item.sl;
    sheet.getCell(`C${r}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    sheet.getCell(`C${r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`G${r}:K${r}`);
    sheet.getCell(`G${r}`).value = item.name;
    sheet.getCell(`G${r}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    sheet.getCell(`G${r}`).alignment = { horizontal: 'left', vertical: 'middle' };

    sheet.mergeCells(`L${r}:P${r}`);
    const valCell = sheet.getCell(`L${r}`);
    valCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    if (item.val === 0) {
      valCell.value = '-';
      valCell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      valCell.value = item.val;
      valCell.numFmt = MILLION_BDT_FORMAT;
      valCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    applyTableBorder(r);
  });

  // Row 22: Total Liability (A) — keeps 3-column grid intact (C22:F22 blank, G22:K22 label, L22:P22 total)
  sheet.mergeCells('C22:F22');
  sheet.mergeCells('G22:K22');
  const cellTotalA = sheet.getCell('G22');
  cellTotalA.value = 'Total Liability (A)';
  cellTotalA.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  cellTotalA.alignment = { horizontal: 'left', vertical: 'middle' };

  sheet.mergeCells('L22:P22');
  const valTotalA = sheet.getCell('L22');
  valTotalA.value = {
    formula: 'SUM(L15:L21)',
    result: summaryResult.liability.totalLiabilityA,
  };
  valTotalA.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  valTotalA.numFmt = MILLION_BDT_FORMAT;
  valTotalA.alignment = { horizontal: 'center', vertical: 'middle' };
  applyTableBorder(22);

  // SECTION B: Settlement Amount Covering Cost of Fund
  sheet.mergeCells('C24:P24');
  const cellBHeader = sheet.getCell('C24');
  cellBHeader.value = 'B) Settlement Amount Covering Cost of Fund';
  cellBHeader.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  cellBHeader.fill = headerFill;
  cellBHeader.alignment = { horizontal: 'left', vertical: 'middle' };
  applyTableBorder(24);

  // Row 25 headers
  sheet.mergeCells('C25:F25');
  sheet.getCell('C25').value = 'SL';
  sheet.getCell('C25').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells('G25:K25');
  sheet.getCell('G25').value = 'Particular';
  sheet.getCell('G25').alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.mergeCells('L25:P25');
  sheet.getCell('L25').value = 'Amount';
  sheet.getCell('L25').alignment = { horizontal: 'center', vertical: 'middle' };
  applyTableBorder(25);
  ['C25', 'G25', 'L25'].forEach((pos) => {
    sheet.getCell(pos).font = { name: 'Arial', size: 8.5, bold: false, color: { argb: 'FF000000' } };
  });

  // Rows 26-28: Principal, Charges, Cost of Fund
  const bRows = [
    { r: 26, sl: 1, name: 'Principal', formula: 'L15', val: summaryResult.settlement.principal },
    { r: 27, sl: 2, name: 'Charges', formula: 'L18', val: summaryResult.settlement.charges },
    { r: 28, sl: 3, name: 'Cost of Fund', formula: null, val: summaryResult.settlement.costOfFund },
  ];

  bRows.forEach((item) => {
    sheet.mergeCells(`C${item.r}:F${item.r}`);
    sheet.getCell(`C${item.r}`).value = item.sl;
    sheet.getCell(`C${item.r}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    sheet.getCell(`C${item.r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`G${item.r}:K${item.r}`);
    sheet.getCell(`G${item.r}`).value = item.name;
    sheet.getCell(`G${item.r}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    sheet.getCell(`G${item.r}`).alignment = { horizontal: 'left', vertical: 'middle' };

    sheet.mergeCells(`L${item.r}:P${item.r}`);
    const valCell = sheet.getCell(`L${item.r}`);
    if (item.formula) {
      valCell.value = { formula: item.formula, result: item.val };
    } else {
      valCell.value = item.val;
    }
    valCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    valCell.numFmt = MILLION_BDT_FORMAT;
    valCell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyTableBorder(item.r);
  });

  // Row 29: Total Settlement Amount (B)
  sheet.mergeCells('C29:F29');
  sheet.mergeCells('G29:K29');
  const cellTotalB = sheet.getCell('G29');
  cellTotalB.value = 'Total Settlement Amount (B)';
  cellTotalB.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  cellTotalB.alignment = { horizontal: 'left', vertical: 'middle' };

  sheet.mergeCells('L29:P29');
  const valTotalB = sheet.getCell('L29');
  valTotalB.value = {
    formula: 'SUM(L26:L28)',
    result: summaryResult.settlement.totalSettlementB,
  };
  valTotalB.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  valTotalB.numFmt = MILLION_BDT_FORMAT;
  valTotalB.alignment = { horizontal: 'center', vertical: 'middle' };
  applyTableBorder(29);

  // SECTION C: Proposed Waiver Covering Cost of Fund (A-B)
  sheet.mergeCells('C31:P31');
  const cellCHeader = sheet.getCell('C31');
  cellCHeader.value = 'C) Proposed Waiver Covering Cost of Fund (A-B)';
  cellCHeader.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  cellCHeader.fill = headerFill;
  cellCHeader.alignment = { horizontal: 'left', vertical: 'middle' };
  applyTableBorder(31);

  // Row 32 headers
  sheet.mergeCells('C32:F32');
  sheet.getCell('C32').value = 'SL';
  sheet.getCell('C32').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells('G32:K32');
  sheet.getCell('G32').value = 'Particular';
  sheet.getCell('G32').alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.mergeCells('L32:P32');
  sheet.getCell('L32').value = 'Amount';
  sheet.getCell('L32').alignment = { horizontal: 'center', vertical: 'middle' };
  applyTableBorder(32);
  ['C32', 'G32', 'L32'].forEach((pos) => {
    sheet.getCell(pos).font = { name: 'Arial', size: 8.5, bold: false, color: { argb: 'FF000000' } };
  });

  // Rows 33-40: SL 1,2,3,4, Current Principal (1+2+3+4), 6, 7, 8 all "-"
  const cRows = [
    { r: 33, sl: '1', name: 'Principal' },
    { r: 34, sl: '2', name: 'Profit' },
    { r: 35, sl: '3', name: 'Gestation Rent' },
    { r: 36, sl: '4', name: 'Charges' },
    { r: 37, sl: '-', name: 'Current Principal (1+2+3+4)' },
    { r: 38, sl: '6', name: 'Compensation' },
    { r: 39, sl: '7', name: 'Uncharged Compensation' },
    { r: 40, sl: '8', name: 'Uncharged Profit' },
  ];

  cRows.forEach((item) => {
    sheet.mergeCells(`C${item.r}:F${item.r}`);
    sheet.getCell(`C${item.r}`).value = item.sl;
    sheet.getCell(`C${item.r}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    sheet.getCell(`C${item.r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`G${item.r}:K${item.r}`);
    sheet.getCell(`G${item.r}`).value = item.name;
    sheet.getCell(`G${item.r}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    sheet.getCell(`G${item.r}`).alignment = { horizontal: 'left', vertical: 'middle' };

    sheet.mergeCells(`L${item.r}:P${item.r}`);
    const valCell = sheet.getCell(`L${item.r}`);
    valCell.value = '-';
    valCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    valCell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyTableBorder(item.r);
  });

  // Row 41: Total Liability = L22 - L29
  sheet.mergeCells('C41:F41');
  sheet.mergeCells('G41:K41');
  const cellTotalC = sheet.getCell('G41');
  cellTotalC.value = 'Total Liability';
  cellTotalC.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  cellTotalC.alignment = { horizontal: 'left', vertical: 'middle' };

  sheet.mergeCells('L41:P41');
  const valTotalC = sheet.getCell('L41');
  valTotalC.value = {
    formula: 'L22-L29',
    result: summaryResult.waiver.totalWaiverC,
  };
  valTotalC.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  valTotalC.numFmt = MILLION_BDT_FORMAT;
  valTotalC.alignment = { horizontal: 'center', vertical: 'middle' };
  applyTableBorder(41);

  // Row 43: Security Valuation
  sheet.getCell('C43').value = 'SL';
  sheet.getCell('C43').font = { name: 'Arial', size: 8.5, bold: false, color: { argb: 'FF000000' } };
  sheet.getCell('C43').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells('D43:M43');
  const secFirm = manual.valuationFirm ? stripUnwantedSummaryText(manual.valuationFirm) : 'Survey Firm';
  const secDate = manual.valuationDate ? stripUnwantedSummaryText(manual.valuationDate) : '11/11/2026';
  sheet.getCell('D43').value = `Security Valuation by ${secFirm} On ${secDate}`;
  sheet.getCell('D43').font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  sheet.getCell('D43').fill = headerFill;

  sheet.mergeCells('N43:P43');
  sheet.getCell('N43').value = 'Amount';
  sheet.getCell('N43').font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  sheet.getCell('N43').alignment = { horizontal: 'center', vertical: 'middle' };
  applyTableBorder(43);

  // Rows 44-46: MV, FSV, Liability covered by FSV (%)
  const secRows = [
    { r: 44, sl: 1, name: 'Market Value (MV)', val: manual.marketValue },
    { r: 45, sl: 2, name: 'Forced Sale Value (FSV)', val: manual.forcedSaleValue },
  ];

  secRows.forEach((item) => {
    sheet.getCell(`C${item.r}`).value = item.sl;
    sheet.getCell(`C${item.r}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    sheet.getCell(`C${item.r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`D${item.r}:M${item.r}`);
    sheet.getCell(`D${item.r}`).value = item.name;
    sheet.getCell(`D${item.r}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };

    sheet.mergeCells(`N${item.r}:P${item.r}`);
    const vCell = sheet.getCell(`N${item.r}`);
    vCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    if (item.val !== null && item.val !== undefined && item.val !== ('' as unknown as number)) {
      vCell.value = item.val;
      vCell.numFmt = MILLION_BDT_FORMAT;
      vCell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      vCell.value = '';
      vCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    applyTableBorder(item.r);
  });

  // Row 46: Liability covered by FSV (%)
  sheet.getCell('C46').value = 3;
  sheet.getCell('C46').font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
  sheet.getCell('C46').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells('D46:M46');
  sheet.getCell('D46').value = 'Liability covered by FSV (%)';
  sheet.getCell('D46').font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };

  sheet.mergeCells('N46:P46');
  const fsvCovCell = sheet.getCell('N46');
  fsvCovCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  const manualPercentVal = manual.liabilityCoveredByFsvPercentManual
    ? parseFloat(manual.liabilityCoveredByFsvPercentManual)
    : null;

  if (manualPercentVal !== null && !isNaN(manualPercentVal) && !manual.useSuggestedFsvPercent) {
    // User explicitly entered a custom percentage
    fsvCovCell.value = manualPercentVal / 100;
    fsvCovCell.numFmt = '0.00%';
    fsvCovCell.alignment = { horizontal: 'center', vertical: 'middle' };
  } else if (manual.useSuggestedFsvPercent && manual.forcedSaleValue && summaryResult.liability.totalLiabilityA > 0) {
    // Calculated suggestion with formula
    fsvCovCell.value = {
      formula: 'N45/L22',
      result: manual.forcedSaleValue / summaryResult.liability.totalLiabilityA,
    };
    fsvCovCell.numFmt = '0.00%';
    fsvCovCell.alignment = { horizontal: 'center', vertical: 'middle' };
  } else if (manual.liabilityCoveredByFsvPercentManual && manual.liabilityCoveredByFsvPercentManual.trim() !== '') {
    const parsed = parseFloat(manual.liabilityCoveredByFsvPercentManual);
    if (!isNaN(parsed)) {
      fsvCovCell.value = parsed / 100;
      fsvCovCell.numFmt = '0.00%';
      fsvCovCell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      fsvCovCell.value = '';
    }
  } else {
    fsvCovCell.value = '';
    fsvCovCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  applyTableBorder(46);

  // Row 48: Legal Position
  sheet.getCell('C48').value = 'SL';
  sheet.getCell('C48').font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
  sheet.getCell('C48').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells('D48:E48');
  sheet.getCell('D48').value = 'Legal Position';
  sheet.getCell('D48').font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  sheet.mergeCells('F48:P48');
  sheet.getCell('F48').value = 'Particulars';
  sheet.getCell('F48').font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };
  applyTableBorder(48);

  const legalRows = [
    { r: 49, sl: 1, title: 'NI ACT', text: stripUnwantedSummaryText(manual.legalNiAct) },
    { r: 50, sl: 2, title: 'Arthari & Other', text: stripUnwantedSummaryText(manual.legalArthari) },
    { r: 51, sl: 3, title: 'Other', text: stripUnwantedSummaryText(manual.legalOther) },
  ];

  legalRows.forEach((item) => {
    sheet.getCell(`C${item.r}`).value = item.sl;
    sheet.getCell(`C${item.r}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    sheet.getCell(`C${item.r}`).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`D${item.r}:E${item.r}`);
    sheet.getCell(`D${item.r}`).value = item.title;
    sheet.getCell(`D${item.r}`).font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF000000' } };

    sheet.mergeCells(`F${item.r}:P${item.r}`);
    sheet.getCell(`F${item.r}`).value = item.text ? item.text : '';
    sheet.getCell(`F${item.r}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF000000' } };
    applyTableBorder(item.r);
  });

  // Row 53: Special Remarks
  sheet.mergeCells('C53:P53');
  const remCell = sheet.getCell('C53');
  const cleanedRemarks = stripUnwantedSummaryText(manual.specialRemarks);
  remCell.value = cleanedRemarks ? `Special Remarks: ${cleanedRemarks}` : '';
  remCell.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF000000' } };

  // Write and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, 'Summary.xlsx');
}

/**
 * Downloads both Cost_of_Fund.xlsx and Summary.xlsx in parallel
 */
export async function exportBothExcel(
  cofResult: CofCalculationResult,
  summaryResult: SummaryCalculationResult,
  rateTable: RateYear[],
  manual: ManualInputs,
  calculationUpToDate?: string
): Promise<void> {
  await Promise.all([
    exportCofExcel(cofResult, rateTable, manual),
    exportSummaryExcel(summaryResult, cofResult, manual, calculationUpToDate),
  ]);
}
