import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import {
  CofCalculationResult,
  ManualInputs,
  SummaryCalculationResult,
} from '../types';
import { formatBdt, formatMillion } from '../utils/numberUtils';
import { formatSettlementSummaryDates } from '../utils/dateUtils';
import { calculateFsvCoveragePercent } from '../engine/summaryEngine';

interface SummaryPreviewTableProps {
  summaryResult: SummaryCalculationResult;
  cofResult: CofCalculationResult;
  manual: ManualInputs;
  calculationUpToDate?: string;
}

function stripUnwantedSummaryText(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .replace(/No\.?\s+Account\s+No\.?\s+Status\.?\s+Type\s+Open/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export const SummaryPreviewTable: React.FC<SummaryPreviewTableProps> = ({
  summaryResult,
  cofResult: _cofResult,
  manual,
  calculationUpToDate,
}) => {
  const [showInMillions, setShowInMillions] = useState(true);
  const [showWaiverBreakdown, setShowWaiverBreakdown] = useState(false);

  const displayAmt = (val: number | null | undefined, zeroAsDash = true): string => {
    if (val === 0 || val === null || val === undefined) {
      return zeroAsDash ? '-' : '0.00';
    }
    if (showInMillions) {
      return formatMillion(val, zeroAsDash);
    }
    return formatBdt(val, zeroAsDash);
  };

  const fsvPercent = calculateFsvCoveragePercent(
    manual.forcedSaleValue,
    summaryResult.liability.totalLiabilityA
  );

  const logoSrc = manual.bankLogo || '/assets/bank_logo_ref.png';
  const bismillahSrc = manual.bismillahImage || '/assets/bismillah_ref.png';

  const bankLine1Text = manual.bankLine1 ? stripUnwantedSummaryText(manual.bankLine1) : 'SAMMILITO ISLAMI BANK PLC.';
  const bankLine2Text = manual.bankLine2 ? stripUnwantedSummaryText(manual.bankLine2) : '(State-owned Shariah-based Bank)';
  const hasParens = bankLine2Text.startsWith('(') && bankLine2Text.endsWith(')');
  const bankLine2Inner = hasParens ? bankLine2Text.slice(1, -1) : bankLine2Text;
  const bankLine3Text = manual.bankLine3 ? stripUnwantedSummaryText(manual.bankLine3) : 'UNION BANK UNIT';
  const bankLine4Text = manual.bankLine4 ? stripUnwantedSummaryText(manual.bankLine4) : 'Special Assets Management Division';
  const branchNameText = manual.branchName ? stripUnwantedSummaryText(manual.branchName) : 'EIDGAON BRANCH';
  const rawUpToDate =
    calculationUpToDate !== undefined ? calculationUpToDate : manual.calculationUpToDate;
  const summaryDates = formatSettlementSummaryDates(
    stripUnwantedSummaryText(rawUpToDate)
  );
  const clientNameText = manual.clientName ? stripUnwantedSummaryText(manual.clientName) : 'M/S OCEAN AGRO FARM';
  const managingDirectorText = stripUnwantedSummaryText(manual.managingDirectorName) || '-';
  const valuationFirmText = manual.valuationFirm ? stripUnwantedSummaryText(manual.valuationFirm) : 'Survey Firm';
  const valuationDateText = manual.valuationDate ? stripUnwantedSummaryText(manual.valuationDate) : '11/11/2026';
  const legalNiActText = stripUnwantedSummaryText(manual.legalNiAct);
  const legalArthariText = stripUnwantedSummaryText(manual.legalArthari);
  const legalOtherText = stripUnwantedSummaryText(manual.legalOther);
  const specialRemarksText = stripUnwantedSummaryText(manual.specialRemarks);

  return (
    <div className="space-y-4">
      {/* View Toolbar: Unit Toggle & Waiver Breakdown Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-100 dark:bg-neutral-850 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
            <span>Display Figures In:</span>
            <div className="inline-flex rounded-lg bg-neutral-200 dark:bg-neutral-750 p-0.5">
              <button
                type="button"
                onClick={() => setShowInMillions(true)}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors cursor-pointer ${
                  showInMillions
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Million BDT (Template Standard)
              </button>
              <button
                type="button"
                onClick={() => setShowInMillions(false)}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors cursor-pointer ${
                  !showInMillions
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Exact BDT (Full Digits)
              </button>
            </div>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer select-none text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={showWaiverBreakdown}
              onChange={(e) => setShowWaiverBreakdown(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Show waiver breakdown (on-screen only)</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-neutral-500 italic">
            Excel exports preserve exact numbers in BDT while formatting in millions.
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 font-semibold transition-colors cursor-pointer"
            title="Print or save Settlement Summary as US Letter PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Sheet Replica Card — Exact Reference Document Layout (612pt x 792pt US Letter) */}
      <div className="overflow-x-auto pb-2">
        <div
          className="summary-print-sheet w-[816px] min-w-[816px] mx-auto bg-white text-black border border-neutral-300 shadow-sm pt-[12px] px-[52.8px] pb-[48px]"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {/* Top Header Area: Bismillah + Left Bank Logo + Centered Navy Title Lines */}
          <div className="relative pb-[7px]">
            {/* Bismillah Calligraphy Centered at Top */}
            <div className="flex justify-center">
              <img
                src={bismillahSrc}
                alt="Bismillah Header"
                className="w-[218.4px] h-[26.88px] object-contain block"
              />
            </div>

            {/* Bank Logo Positioned at Top-Left Margin */}
            <img
              src={logoSrc}
              alt="Bank Logo"
              className="absolute left-[-2.4px] top-[22px] w-[77.1px] h-[86.7px] object-contain"
            />

            {/* Bank Header Center Lines (#17365d) */}
            <div className="text-center text-[#17365d] mt-[2px] leading-[1.24]">
              <h2
                className="text-[16px] font-bold tracking-normal"
                style={{ fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}
              >
                {bankLine1Text}
              </h2>
              <p className="font-bold leading-[1.18]">
                {hasParens && (
                  <span
                    className="text-[12px] font-bold"
                    style={{ fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}
                  >
                    (
                  </span>
                )}
                <span
                  className="text-[17.28px] font-bold"
                  style={{ fontFamily: "'Bell MT', Georgia, 'Times New Roman', serif" }}
                >
                  {bankLine2Inner}
                </span>
                {hasParens && (
                  <span
                    className="text-[12px] font-bold"
                    style={{ fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}
                  >
                    )
                  </span>
                )}
              </p>
              <p
                className="text-[14.72px] font-normal"
                style={{ fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}
              >
                {bankLine3Text}
              </p>
              <p
                className="text-[14.72px] font-normal"
                style={{ fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}
              >
                {bankLine4Text}
              </p>
            </div>
          </div>

          {/* Horizontal Blue Divider Line (#4f81bd) */}
          <div className="border-t-[1.3px] border-[#4f81bd] -mx-[2px]" />

          {/* Header Metadata Rows (Arial 9pt / 12px Bold) */}
          <div className="mt-[8px] mb-[4px] text-[12px] font-bold text-black leading-[1.34]">
            <div className="flex justify-between items-baseline">
              <span>Branch Name: {branchNameText} Branch</span>
              <span>Date:{summaryDates ? summaryDates.slashDate : ''}</span>
            </div>
            <div>
              Client Name: {clientNameText}
            </div>
            <div>
              Managing Director: {managingDirectorText}
            </div>
            <div className="text-right mt-[1px]">
              {showInMillions ? 'Figure in Million BDT' : 'Figure in BDT'}
            </div>
          </div>

          {/* SECTION A: Liability Position */}
          <table className="w-full border-collapse text-[11.36px] text-black">
            <colgroup>
              <col className="w-1/3" />
              <col className="w-1/3" />
              <col className="w-1/3" />
            </colgroup>
            <thead>
              <tr>
                <th
                  colSpan={3}
                  className="bg-[#D9E2F3] text-black font-bold text-left px-[4px] py-[2.5px] border border-black"
                >
                  {summaryDates
                    ? `A) Liability Position as per CBS (Dated on ${summaryDates.dotDate})`
                    : 'A) Liability Position as per CBS'}
                </th>
              </tr>
              <tr className="bg-white text-black font-normal">
                <th className="font-normal text-center px-[4px] py-[2.5px] border border-black">
                  SL
                </th>
                <th className="font-normal text-left px-[4px] py-[2.5px] border border-black">
                  Particular
                </th>
                <th className="font-normal text-center px-[4px] py-[2.5px] border border-black">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white text-black">
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">1</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Principal</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {displayAmt(summaryResult.liability.principal)}
                </td>
              </tr>
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">2</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Charged Profit</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {displayAmt(summaryResult.liability.chargedProfit)}
                </td>
              </tr>
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">3</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Gestation Rent</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
              </tr>
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">4</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Charges (Legal & Others)</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {displayAmt(summaryResult.liability.charges)}
                </td>
              </tr>
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">5</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Compensation</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {displayAmt(summaryResult.liability.compensation)}
                </td>
              </tr>
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">6</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Uncharged Compensation</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {displayAmt(summaryResult.liability.unchargedCompensation)}
                </td>
              </tr>
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">7</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Uncharged Profit</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
              </tr>
              <tr className="font-bold">
                <td className="px-[4px] py-[2.5px] border border-black"></td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">
                  Total Liability (A)
                </td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {displayAmt(summaryResult.liability.totalLiabilityA)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* SECTION B: Settlement Amount Covering Cost of Fund */}
          <table className="w-full border-collapse text-[11.36px] text-black mt-[14px]">
            <colgroup>
              <col className="w-1/3" />
              <col className="w-1/3" />
              <col className="w-1/3" />
            </colgroup>
            <thead>
              <tr>
                <th
                  colSpan={3}
                  className="bg-[#D9E2F3] text-black font-bold text-left px-[4px] py-[2.5px] border border-black"
                >
                  B) Settlement Amount Covering Cost of Fund
                </th>
              </tr>
              <tr className="bg-white text-black font-normal">
                <th className="font-normal text-center px-[4px] py-[2.5px] border border-black">
                  SL
                </th>
                <th className="font-normal text-left px-[4px] py-[2.5px] border border-black">
                  Particular
                </th>
                <th className="font-normal text-center px-[4px] py-[2.5px] border border-black">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white text-black">
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">1</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Principal (= A.1)</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {displayAmt(summaryResult.settlement.principal)}
                </td>
              </tr>
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">2</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Charges (= A.4)</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {displayAmt(summaryResult.settlement.charges)}
                </td>
              </tr>
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">3</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">
                  Cost of Fund (Surplus / Deficit from Cal. 1)
                </td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {displayAmt(summaryResult.settlement.costOfFund)}
                </td>
              </tr>
              <tr className="font-bold">
                <td className="px-[4px] py-[2.5px] border border-black"></td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">
                  Total Settlement Amount (B)
                </td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {displayAmt(summaryResult.settlement.totalSettlementB)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* SECTION C: Proposed Waiver Covering Cost of Fund (A-B) */}
          <table className="w-full border-collapse text-[11.36px] text-black mt-[14px]">
            <colgroup>
              <col className="w-1/3" />
              <col className="w-1/3" />
              <col className="w-1/3" />
            </colgroup>
            <thead>
              <tr>
                <th
                  colSpan={3}
                  className="bg-[#D9E2F3] text-black font-bold text-left px-[4px] py-[2.5px] border border-black"
                >
                  C) Proposed Waiver Covering Cost of Fund (A - B)
                </th>
              </tr>
              <tr className="bg-white text-black font-normal">
                <th className="font-normal text-center px-[4px] py-[2.5px] border border-black">
                  SL
                </th>
                <th className="font-normal text-left px-[4px] py-[2.5px] border border-black">
                  Particular
                </th>
                <th className="font-normal text-center px-[4px] py-[2.5px] border border-black">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white text-black">
              {showWaiverBreakdown ? (
                <>
                  <tr>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">1</td>
                    <td className="px-[4px] py-[2.5px] text-left border border-black">Principal Waiver</td>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
                  </tr>
                  <tr>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">2</td>
                    <td className="px-[4px] py-[2.5px] text-left border border-black">Charged Profit Waiver</td>
                    <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                      {displayAmt(summaryResult.liability.chargedProfit)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">3</td>
                    <td className="px-[4px] py-[2.5px] text-left border border-black">
                      Compensation Waiver (Net of COF)
                    </td>
                    <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                      {displayAmt(
                        Math.max(
                          0,
                          summaryResult.liability.compensation +
                            summaryResult.liability.unchargedCompensation -
                            summaryResult.settlement.costOfFund
                        )
                      )}
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">1</td>
                    <td className="px-[4px] py-[2.5px] text-left border border-black">Principal</td>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
                  </tr>
                  <tr>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">2</td>
                    <td className="px-[4px] py-[2.5px] text-left border border-black">Profit</td>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
                  </tr>
                  <tr>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">3</td>
                    <td className="px-[4px] py-[2.5px] text-left border border-black">Gestation Rent</td>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
                  </tr>
                  <tr>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">4</td>
                    <td className="px-[4px] py-[2.5px] text-left border border-black">Charges</td>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
                  </tr>
                  <tr>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
                    <td className="px-[4px] py-[2.5px] text-left border border-black">
                      Current Principal (1+2+3+4)
                    </td>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
                  </tr>
                  <tr>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">6</td>
                    <td className="px-[4px] py-[2.5px] text-left border border-black">Compensation</td>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
                  </tr>
                  <tr>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">7</td>
                    <td className="px-[4px] py-[2.5px] text-left border border-black">Uncharged Compensation</td>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
                  </tr>
                  <tr>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">8</td>
                    <td className="px-[4px] py-[2.5px] text-left border border-black">Uncharged Profit</td>
                    <td className="px-[4px] py-[2.5px] text-center border border-black">-</td>
                  </tr>
                </>
              )}
              <tr className="font-bold">
                <td className="px-[4px] py-[2.5px] border border-black"></td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">
                  Total Liability (A - B)
                </td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {displayAmt(summaryResult.waiver.totalWaiverC)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Security Valuation Table (Preserved Intact in Reference Document Style) */}
          <table className="w-full border-collapse text-[11.36px] text-black mt-[14px]">
            <colgroup>
              <col className="w-1/3" />
              <col className="w-1/3" />
              <col className="w-1/3" />
            </colgroup>
            <thead>
              <tr>
                <th
                  colSpan={3}
                  className="bg-[#D9E2F3] text-black font-bold text-left px-[4px] py-[2.5px] border border-black"
                >
                  Security Valuation by {valuationFirmText} On {valuationDateText}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white text-black">
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">1</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Market Value (MV)</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {manual.marketValue !== null && manual.marketValue !== undefined
                    ? displayAmt(manual.marketValue)
                    : ''}
                </td>
              </tr>
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">2</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Forced Sale Value (FSV)</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {manual.forcedSaleValue !== null && manual.forcedSaleValue !== undefined
                    ? displayAmt(manual.forcedSaleValue)
                    : ''}
                </td>
              </tr>
              <tr className="font-bold">
                <td className="px-[4px] py-[2.5px] text-center border border-black font-normal">3</td>
                <td className="px-[4px] py-[2.5px] text-left border border-black">Liability covered by FSV (%)</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black tabular-nums">
                  {manual.liabilityCoveredByFsvPercentManual && !manual.useSuggestedFsvPercent
                    ? `${parseFloat(manual.liabilityCoveredByFsvPercentManual).toFixed(2)}% (Manual)`
                    : fsvPercent > 0
                    ? `${fsvPercent.toFixed(2)}%`
                    : ''}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Legal Position Table (Preserved Intact in Reference Document Style) */}
          <table className="w-full border-collapse text-[11.36px] text-black mt-[14px]">
            <colgroup>
              <col className="w-1/3" />
              <col className="w-1/3" />
              <col className="w-1/3" />
            </colgroup>
            <thead>
              <tr>
                <th
                  colSpan={3}
                  className="bg-[#D9E2F3] text-black font-bold text-left px-[4px] py-[2.5px] border border-black"
                >
                  Legal Position
                </th>
              </tr>
            </thead>
            <tbody className="bg-white text-black">
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">1</td>
                <td className="px-[4px] py-[2.5px] text-left font-bold border border-black">NI ACT</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black">
                  {legalNiActText}
                </td>
              </tr>
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">2</td>
                <td className="px-[4px] py-[2.5px] text-left font-bold border border-black">Arthari & Other</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black">
                  {legalArthariText}
                </td>
              </tr>
              <tr>
                <td className="px-[4px] py-[2.5px] text-center border border-black">3</td>
                <td className="px-[4px] py-[2.5px] text-left font-bold border border-black">Other</td>
                <td className="px-[4px] py-[2.5px] text-center border border-black">
                  {legalOtherText}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Special Remarks */}
          <div className="mt-[12px] text-[11.36px] text-black leading-[1.35]">
            <span className="font-bold">Special Remarks: </span>
            {specialRemarksText ? (
              <span className="italic">{specialRemarksText}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
