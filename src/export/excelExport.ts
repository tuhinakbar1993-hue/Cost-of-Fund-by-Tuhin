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
import { formatUtcDayDot } from '../utils/dateUtils';

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

      // C: Start Date (dd/mm/yyyy)
      const cCell = row.getCell(3);
      cCell.value = seg.startDate;
      cCell.alignment = { horizontal: 'center' };
      cCell.font = { name: 'Times New Roman', size: 11 };
      cCell.border = THIN_BORDER;

      // D: End Date (dd/mm/yyyy)
      const dCell = row.getCell(4);
      dCell.value = seg.endDate;
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

/**
 * Generates and downloads Summary.xlsx
 */
export async function exportSummaryExcel(
  summaryResult: SummaryCalculationResult,
  cofResult: CofCalculationResult,
  manual: ManualInputs
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Special Asset Management';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Enigma Summary', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Setup column widths
  for (let c = 1; c <= 16; c++) {
    sheet.getColumn(c).width = 5.5;
  }
  sheet.getColumn(7).width = 8;
  sheet.getColumn(8).width = 8;
  sheet.getColumn(9).width = 8;
  sheet.getColumn(12).width = 8;

  const headerFill = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFD9E2F3' },
  };

  // Embed Bismillah Image and Bank Logo if provided
  if (manual.bismillahImage && manual.bismillahImage.startsWith('data:image')) {
    try {
      const match = manual.bismillahImage.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' || match[1] === 'jpg' ? 'jpeg' : 'png';
        const bismillahId = workbook.addImage({
          base64: manual.bismillahImage,
          extension: ext as 'jpeg' | 'png',
        });
        sheet.addImage(bismillahId, {
          tl: { col: 7, row: 0.8 },
          ext: { width: 150, height: 35 },
        });
      }
    } catch {
      // ignore image embedding failure if format unsupported
    }
  }

  if (manual.bankLogo && manual.bankLogo.startsWith('data:image')) {
    try {
      const match = manual.bankLogo.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' || match[1] === 'jpg' ? 'jpeg' : 'png';
        const logoId = workbook.addImage({
          base64: manual.bankLogo,
          extension: ext as 'jpeg' | 'png',
        });
        sheet.addImage(logoId, {
          tl: { col: 2.5, row: 3 },
          ext: { width: 50, height: 50 },
        });
      }
    } catch {
      // ignore image embedding failure if format unsupported
    }
  }

  // Bank Header (F4:N4, F5:N5, F6:N6, F7:N7)
  const bankLines = [
    manual.bankLine1 || 'SAMMILITO ISLAMI BANK PLC.',
    manual.bankLine2 || '(State-owned Shariah-based Bank)',
    manual.bankLine3 || 'UNION BANK UNIT',
    manual.bankLine4 || 'Special Assets Management Division',
  ];

  bankLines.forEach((text, i) => {
    const r = 4 + i;
    sheet.mergeCells(`F${r}:N${r}`);
    const cell = sheet.getCell(`F${r}`);
    cell.value = text;
    cell.font = {
      name: 'Arial',
      size: i === 0 ? 12 : 10,
      bold: i === 0,
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Row 9: Branch Name (C9) and Date (L9:P9)
  const cellC9 = sheet.getCell('C9');
  cellC9.value = `Branch Name: ${manual.branchName || 'EIDGAON BRANCH'}`;
  cellC9.font = { name: 'Arial', size: 10, bold: true };

  sheet.mergeCells('L9:P9');
  const cellL9 = sheet.getCell('L9');
  cellL9.value = `Date:${manual.calculationUpToDate || '11/11/2026'}`;
  cellL9.font = { name: 'Arial', size: 10, bold: true };
  cellL9.alignment = { horizontal: 'right' };

  // Row 10: Client Name
  const cellC10 = sheet.getCell('C10');
  cellC10.value = `Client Name: ${manual.clientName || 'M/S OCEAN AGRO FARM'}`;
  cellC10.font = { name: 'Arial', size: 10, bold: true };

  // Row 11: Managing Director
  const cellC11 = sheet.getCell('C11');
  cellC11.value = `Managing Director: ${manual.managingDirectorName || '-'}`;
  cellC11.font = { name: 'Arial', size: 10 };

  // Row 12: Figure in Million BDT
  sheet.mergeCells('L12:P12');
  const cellL12 = sheet.getCell('L12');
  cellL12.value = 'Figure in Million BDT';
  cellL12.font = { name: 'Arial', size: 9, italic: true };
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
  cellAHeader.value = `A) Liability Position as per CBS (Dated on ${formatUtcDayDot(
    Date.now()
  )})`;
  cellAHeader.font = { name: 'Arial', size: 10, bold: true };
  cellAHeader.fill = headerFill;
  applyTableBorder(13);

  // Headers (Row 14)
  sheet.mergeCells('C14:F14');
  sheet.getCell('C14').value = 'SL';
  sheet.getCell('C14').alignment = { horizontal: 'center' };

  sheet.mergeCells('G14:K14');
  sheet.getCell('G14').value = 'Particular';
  sheet.getCell('G14').alignment = { horizontal: 'left' };

  sheet.mergeCells('L14:P14');
  sheet.getCell('L14').value = 'Amount';
  sheet.getCell('L14').alignment = { horizontal: 'right' };
  applyTableBorder(14);
  ['C14', 'G14', 'L14'].forEach((pos) => {
    sheet.getCell(pos).font = { name: 'Arial', size: 10, bold: true };
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
    sheet.getCell(`C${r}`).alignment = { horizontal: 'center' };

    sheet.mergeCells(`G${r}:K${r}`);
    sheet.getCell(`G${r}`).value = item.name;

    sheet.mergeCells(`L${r}:P${r}`);
    const valCell = sheet.getCell(`L${r}`);
    if (item.val === 0) {
      valCell.value = '-';
      valCell.alignment = { horizontal: 'center' };
    } else {
      valCell.value = item.val;
      valCell.numFmt = MILLION_BDT_FORMAT;
      valCell.alignment = { horizontal: 'right' };
    }
    applyTableBorder(r);
  });

  // Row 22: Total Liability (A)
  sheet.mergeCells('C22:K22');
  const cellTotalA = sheet.getCell('C22');
  cellTotalA.value = 'Total Liability (A)';
  cellTotalA.font = { name: 'Arial', size: 10, bold: true };

  sheet.mergeCells('L22:P22');
  const valTotalA = sheet.getCell('L22');
  valTotalA.value = {
    formula: 'SUM(L15:L21)',
    result: summaryResult.liability.totalLiabilityA,
  };
  valTotalA.font = { name: 'Arial', size: 10, bold: true };
  valTotalA.numFmt = MILLION_BDT_FORMAT;
  valTotalA.alignment = { horizontal: 'right' };
  applyTableBorder(22);

  // SECTION B: Settlement Amount Covering Cost of Fund
  sheet.mergeCells('C24:P24');
  const cellBHeader = sheet.getCell('C24');
  cellBHeader.value = 'B) Settlement Amount Covering Cost of Fund';
  cellBHeader.font = { name: 'Arial', size: 10, bold: true };
  cellBHeader.fill = headerFill;
  applyTableBorder(24);

  // Row 25 headers
  sheet.mergeCells('C25:F25');
  sheet.getCell('C25').value = 'SL';
  sheet.getCell('C25').alignment = { horizontal: 'center' };
  sheet.mergeCells('G25:K25');
  sheet.getCell('G25').value = 'Particular';
  sheet.mergeCells('L25:P25');
  sheet.getCell('L25').value = 'Amount';
  sheet.getCell('L25').alignment = { horizontal: 'right' };
  applyTableBorder(25);
  ['C25', 'G25', 'L25'].forEach((pos) => {
    sheet.getCell(pos).font = { name: 'Arial', size: 10, bold: true };
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
    sheet.getCell(`C${item.r}`).alignment = { horizontal: 'center' };

    sheet.mergeCells(`G${item.r}:K${item.r}`);
    sheet.getCell(`G${item.r}`).value = item.name;

    sheet.mergeCells(`L${item.r}:P${item.r}`);
    const valCell = sheet.getCell(`L${item.r}`);
    if (item.formula) {
      valCell.value = { formula: item.formula, result: item.val };
    } else {
      valCell.value = item.val;
    }
    valCell.numFmt = MILLION_BDT_FORMAT;
    valCell.alignment = { horizontal: 'right' };
    applyTableBorder(item.r);
  });

  // Row 29: Total Settlement Amount (B)
  sheet.mergeCells('C29:K29');
  const cellTotalB = sheet.getCell('C29');
  cellTotalB.value = 'Total Settlement Amount (B)';
  cellTotalB.font = { name: 'Arial', size: 10, bold: true };

  sheet.mergeCells('L29:P29');
  const valTotalB = sheet.getCell('L29');
  valTotalB.value = {
    formula: 'SUM(L26:L28)',
    result: summaryResult.settlement.totalSettlementB,
  };
  valTotalB.font = { name: 'Arial', size: 10, bold: true };
  valTotalB.numFmt = MILLION_BDT_FORMAT;
  valTotalB.alignment = { horizontal: 'right' };
  applyTableBorder(29);

  // SECTION C: Proposed Waiver Covering Cost of Fund (A-B)
  sheet.mergeCells('C31:P31');
  const cellCHeader = sheet.getCell('C31');
  cellCHeader.value = 'C) Proposed Waiver Covering Cost of Fund (A-B)';
  cellCHeader.font = { name: 'Arial', size: 10, bold: true };
  cellCHeader.fill = headerFill;
  applyTableBorder(31);

  // Row 32 headers
  sheet.mergeCells('C32:F32');
  sheet.getCell('C32').value = 'SL';
  sheet.getCell('C32').alignment = { horizontal: 'center' };
  sheet.mergeCells('G32:K32');
  sheet.getCell('G32').value = 'Particular';
  sheet.mergeCells('L32:P32');
  sheet.getCell('L32').value = 'Amount';
  sheet.getCell('L32').alignment = { horizontal: 'right' };
  applyTableBorder(32);
  ['C32', 'G32', 'L32'].forEach((pos) => {
    sheet.getCell(pos).font = { name: 'Arial', size: 10, bold: true };
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
    sheet.getCell(`C${item.r}`).alignment = { horizontal: 'center' };

    sheet.mergeCells(`G${item.r}:K${item.r}`);
    sheet.getCell(`G${item.r}`).value = item.name;

    sheet.mergeCells(`L${item.r}:P${item.r}`);
    const valCell = sheet.getCell(`L${item.r}`);
    valCell.value = '-';
    valCell.alignment = { horizontal: 'center' };
    applyTableBorder(item.r);
  });

  // Row 41: Total Liability = L22 - L29
  sheet.mergeCells('C41:K41');
  const cellTotalC = sheet.getCell('C41');
  cellTotalC.value = 'Total Liability';
  cellTotalC.font = { name: 'Arial', size: 10, bold: true };

  sheet.mergeCells('L41:P41');
  const valTotalC = sheet.getCell('L41');
  valTotalC.value = {
    formula: 'L22-L29',
    result: summaryResult.waiver.totalWaiverC,
  };
  valTotalC.font = { name: 'Arial', size: 10, bold: true };
  valTotalC.numFmt = MILLION_BDT_FORMAT;
  valTotalC.alignment = { horizontal: 'right' };
  applyTableBorder(41);

  // Row 43: Security Valuation
  sheet.getCell('C43').value = 'SL';
  sheet.getCell('C43').alignment = { horizontal: 'center' };
  sheet.mergeCells('D43:M43');
  const secFirm = manual.valuationFirm || 'Survey Firm';
  const secDate = manual.valuationDate || '11/11/2026';
  sheet.getCell('D43').value = `Security Valuation by ${secFirm} On ${secDate}`;
  sheet.getCell('D43').font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('D43').fill = headerFill;

  sheet.mergeCells('N43:P43');
  sheet.getCell('N43').value = 'Amount';
  sheet.getCell('N43').font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('N43').alignment = { horizontal: 'right' };
  applyTableBorder(43);

  // Rows 44-46: MV, FSV, Liability covered by FSV (%)
  const secRows = [
    { r: 44, sl: 1, name: 'Market Value (MV)', val: manual.marketValue },
    { r: 45, sl: 2, name: 'Forced Sale Value (FSV)', val: manual.forcedSaleValue },
  ];

  secRows.forEach((item) => {
    sheet.getCell(`C${item.r}`).value = item.sl;
    sheet.getCell(`C${item.r}`).alignment = { horizontal: 'center' };

    sheet.mergeCells(`D${item.r}:M${item.r}`);
    sheet.getCell(`D${item.r}`).value = item.name;

    sheet.mergeCells(`N${item.r}:P${item.r}`);
    const vCell = sheet.getCell(`N${item.r}`);
    if (item.val !== null && item.val !== undefined && item.val !== ('' as unknown as number)) {
      vCell.value = item.val;
      vCell.numFmt = MILLION_BDT_FORMAT;
      vCell.alignment = { horizontal: 'right' };
    } else {
      vCell.value = '';
      vCell.alignment = { horizontal: 'center' };
    }
    applyTableBorder(item.r);
  });

  // Row 46: Liability covered by FSV (%)
  sheet.getCell('C46').value = 3;
  sheet.getCell('C46').alignment = { horizontal: 'center' };
  sheet.mergeCells('D46:M46');
  sheet.getCell('D46').value = 'Liability covered by FSV (%)';

  sheet.mergeCells('N46:P46');
  const fsvCovCell = sheet.getCell('N46');
  const manualPercentVal = manual.liabilityCoveredByFsvPercentManual
    ? parseFloat(manual.liabilityCoveredByFsvPercentManual)
    : null;

  if (manualPercentVal !== null && !isNaN(manualPercentVal) && !manual.useSuggestedFsvPercent) {
    // User explicitly entered a custom percentage
    fsvCovCell.value = manualPercentVal / 100;
    fsvCovCell.numFmt = '0.00%';
    fsvCovCell.alignment = { horizontal: 'right' };
  } else if (manual.useSuggestedFsvPercent && manual.forcedSaleValue && summaryResult.liability.totalLiabilityA > 0) {
    // Calculated suggestion with formula
    fsvCovCell.value = {
      formula: 'N45/L22',
      result: manual.forcedSaleValue / summaryResult.liability.totalLiabilityA,
    };
    fsvCovCell.numFmt = '0.00%';
    fsvCovCell.alignment = { horizontal: 'right' };
  } else if (manual.liabilityCoveredByFsvPercentManual && manual.liabilityCoveredByFsvPercentManual.trim() !== '') {
    const parsed = parseFloat(manual.liabilityCoveredByFsvPercentManual);
    if (!isNaN(parsed)) {
      fsvCovCell.value = parsed / 100;
      fsvCovCell.numFmt = '0.00%';
      fsvCovCell.alignment = { horizontal: 'right' };
    } else {
      fsvCovCell.value = '';
    }
  } else {
    fsvCovCell.value = '';
    fsvCovCell.alignment = { horizontal: 'center' };
  }
  applyTableBorder(46);

  // Row 48: Legal Position
  sheet.getCell('C48').value = 'SL';
  sheet.getCell('C48').alignment = { horizontal: 'center' };
  sheet.mergeCells('D48:E48');
  sheet.getCell('D48').value = 'Legal Position';
  sheet.getCell('D48').font = { name: 'Arial', size: 10, bold: true };
  sheet.mergeCells('F48:P48');
  sheet.getCell('F48').value = 'Particulars';
  sheet.getCell('F48').font = { name: 'Arial', size: 10, bold: true };
  applyTableBorder(48);

  const legalRows = [
    { r: 49, sl: 1, title: 'NI ACT', text: manual.legalNiAct ? manual.legalNiAct.trim() : '' },
    { r: 50, sl: 2, title: 'Arthari & Other', text: manual.legalArthari ? manual.legalArthari.trim() : '' },
    { r: 51, sl: 3, title: 'Other', text: manual.legalOther ? manual.legalOther.trim() : '' },
  ];

  legalRows.forEach((item) => {
    sheet.getCell(`C${item.r}`).value = item.sl;
    sheet.getCell(`C${item.r}`).alignment = { horizontal: 'center' };

    sheet.mergeCells(`D${item.r}:E${item.r}`);
    sheet.getCell(`D${item.r}`).value = item.title;

    sheet.mergeCells(`F${item.r}:P${item.r}`);
    sheet.getCell(`F${item.r}`).value = item.text ? item.text : '';
    applyTableBorder(item.r);
  });

  // Row 53: Special Remarks
  sheet.mergeCells('C53:P53');
  const remCell = sheet.getCell('C53');
  remCell.value = manual.specialRemarks && manual.specialRemarks.trim()
    ? `Special Remarks: ${manual.specialRemarks.trim()}`
    : '';
  remCell.font = { name: 'Arial', size: 9, italic: true };

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
  manual: ManualInputs
): Promise<void> {
  await Promise.all([
    exportCofExcel(cofResult, rateTable, manual),
    exportSummaryExcel(summaryResult, cofResult, manual),
  ]);
}
