import React, { useState } from 'react';
import {
  CofCalculationResult,
  ManualInputs,
  SummaryCalculationResult,
} from '../types';
import { formatBdt, formatMillion } from '../utils/numberUtils';
import { calculateFsvCoveragePercent } from '../engine/summaryEngine';

interface SummaryPreviewTableProps {
  summaryResult: SummaryCalculationResult;
  cofResult: CofCalculationResult;
  manual: ManualInputs;
}

export const SummaryPreviewTable: React.FC<SummaryPreviewTableProps> = ({
  summaryResult,
  cofResult,
  manual,
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

  return (
    <div className="space-y-4">
      {/* View Toolbar: Unit Toggle & Waiver Breakdown Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-100 dark:bg-neutral-850 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
        <div className="flex items-center gap-4">
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

        <div className="text-[11px] text-neutral-500 italic">
          Excel exports preserve exact numbers in BDT while formatting in millions.
        </div>
      </div>

      {/* Main Sheet Replica Card */}
      <div className="border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xs space-y-6 font-sans">
        {manual.bismillahImage && (
          <div className="flex justify-center pb-1">
            <img
              src={manual.bismillahImage}
              alt="Bismillah Header"
              className="h-10 max-w-[220px] object-contain"
            />
          </div>
        )}

        {/* Bank Header Center Lines */}
        <div className="relative text-center space-y-0.5">
          {manual.bankLogo && (
            <div className="sm:absolute sm:left-2 sm:top-0 flex justify-center mb-2 sm:mb-0">
              <img
                src={manual.bankLogo}
                alt="Bank Logo"
                className="w-12 h-12 object-contain rounded"
              />
            </div>
          )}
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {manual.bankLine1 || 'SAMMILITO ISLAMI BANK PLC.'}
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {manual.bankLine2 || '(State-owned Shariah-based Bank)'}
          </p>
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {manual.bankLine3 || 'UNION BANK UNIT'}
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {manual.bankLine4 || 'Special Assets Management Division'}
          </p>
        </div>

        {/* Header Metadata Rows */}
        <div className="border-t border-b border-neutral-200 dark:border-neutral-800 py-3 text-xs space-y-1">
          <div className="flex justify-between items-center font-bold">
            <span>Branch Name: {manual.branchName || 'EIDGAON BRANCH'} Branch</span>
            <span>Date: {manual.calculationUpToDate || '11/11/2026'}</span>
          </div>
          <div className="font-bold">
            Client Name: {manual.clientName || 'M/S OCEAN AGRO FARM'}
          </div>
          <div className="text-neutral-700 dark:text-neutral-300">
            Managing Director: {manual.managingDirectorName || '-'}
          </div>
          <div className="text-right text-[11px] italic text-neutral-500">
            {showInMillions ? 'Figure in Million BDT' : 'Figure in BDT'}
          </div>
        </div>

        {/* SECTION A: Liability Position */}
        <div className="border border-neutral-300 dark:border-neutral-700 rounded-lg overflow-hidden">
          <div className="bg-[#D9E2F3] dark:bg-blue-950/70 text-blue-950 dark:text-blue-100 font-bold px-3 py-2 text-xs border-b border-neutral-300 dark:border-neutral-700">
            A) Liability Position as per CBS (Dated on {manual.calculationUpToDate || '11/11/2026'})
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold border-b border-neutral-200 dark:border-neutral-700">
                <th className="py-1.5 px-3 text-center border-r border-neutral-200 dark:border-neutral-700 w-14">
                  SL
                </th>
                <th className="py-1.5 px-3 text-left border-r border-neutral-200 dark:border-neutral-700">
                  Particular
                </th>
                <th className="py-1.5 px-3 text-right w-44">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono text-[11px]">
              <tr>
                <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">1</td>
                <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Principal</td>
                <td className="py-1 px-3 text-right tabular-nums">{displayAmt(summaryResult.liability.principal)}</td>
              </tr>
              <tr>
                <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">2</td>
                <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Charged Profit</td>
                <td className="py-1 px-3 text-right tabular-nums">{displayAmt(summaryResult.liability.chargedProfit)}</td>
              </tr>
              <tr>
                <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">3</td>
                <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Gestation Rent</td>
                <td className="py-1 px-3 text-center text-neutral-400">-</td>
              </tr>
              <tr>
                <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">4</td>
                <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Charges (Legal & Others)</td>
                <td className="py-1 px-3 text-right tabular-nums">{displayAmt(summaryResult.liability.charges)}</td>
              </tr>
              <tr>
                <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">5</td>
                <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Compensation</td>
                <td className="py-1 px-3 text-right tabular-nums">{displayAmt(summaryResult.liability.compensation)}</td>
              </tr>
              <tr>
                <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">6</td>
                <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Uncharged Compensation</td>
                <td className="py-1 px-3 text-right tabular-nums">{displayAmt(summaryResult.liability.unchargedCompensation)}</td>
              </tr>
              <tr>
                <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">7</td>
                <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Uncharged Profit</td>
                <td className="py-1 px-3 text-center text-neutral-400">-</td>
              </tr>
              <tr className="bg-neutral-50 dark:bg-neutral-850 font-bold font-sans text-xs border-t-2 border-neutral-300 dark:border-neutral-600">
                <td colSpan={2} className="py-2 px-3 border-r border-neutral-200 dark:border-neutral-700">
                  Total Liability (A)
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums text-neutral-900 dark:text-neutral-100 text-sm">
                  {displayAmt(summaryResult.liability.totalLiabilityA)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION B: Settlement Amount Covering Cost of Fund */}
        <div className="border border-neutral-300 dark:border-neutral-700 rounded-lg overflow-hidden">
          <div className="bg-[#D9E2F3] dark:bg-blue-950/70 text-blue-950 dark:text-blue-100 font-bold px-3 py-2 text-xs border-b border-neutral-300 dark:border-neutral-700">
            B) Settlement Amount Covering Cost of Fund
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold border-b border-neutral-200 dark:border-neutral-700">
                <th className="py-1.5 px-3 text-center border-r border-neutral-200 dark:border-neutral-700 w-14">
                  SL
                </th>
                <th className="py-1.5 px-3 text-left border-r border-neutral-200 dark:border-neutral-700">
                  Particular
                </th>
                <th className="py-1.5 px-3 text-right w-44">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono text-[11px]">
              <tr>
                <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">1</td>
                <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Principal (= A.1)</td>
                <td className="py-1 px-3 text-right tabular-nums">{displayAmt(summaryResult.settlement.principal)}</td>
              </tr>
              <tr>
                <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">2</td>
                <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Charges (= A.4)</td>
                <td className="py-1 px-3 text-right tabular-nums">{displayAmt(summaryResult.settlement.charges)}</td>
              </tr>
              <tr>
                <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">3</td>
                <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Cost of Fund (Surplus / Deficit from Cal. 1)</td>
                <td className="py-1 px-3 text-right tabular-nums text-emerald-800 dark:text-emerald-300 font-semibold">
                  {displayAmt(summaryResult.settlement.costOfFund)}
                </td>
              </tr>
              <tr className="bg-neutral-50 dark:bg-neutral-850 font-bold font-sans text-xs border-t-2 border-neutral-300 dark:border-neutral-600">
                <td colSpan={2} className="py-2 px-3 border-r border-neutral-200 dark:border-neutral-700">
                  Total Settlement Amount (B)
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums text-neutral-900 dark:text-neutral-100 text-sm">
                  {displayAmt(summaryResult.settlement.totalSettlementB)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION C: Proposed Waiver Covering Cost of Fund (A-B) */}
        <div className="border border-neutral-300 dark:border-neutral-700 rounded-lg overflow-hidden">
          <div className="bg-[#D9E2F3] dark:bg-blue-950/70 text-blue-950 dark:text-blue-100 font-bold px-3 py-2 text-xs border-b border-neutral-300 dark:border-neutral-700">
            C) Proposed Waiver Covering Cost of Fund (A - B)
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold border-b border-neutral-200 dark:border-neutral-700">
                <th className="py-1.5 px-3 text-center border-r border-neutral-200 dark:border-neutral-700 w-14">
                  SL
                </th>
                <th className="py-1.5 px-3 text-left border-r border-neutral-200 dark:border-neutral-700">
                  Particular
                </th>
                <th className="py-1.5 px-3 text-right w-44">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono text-[11px]">
              {showWaiverBreakdown ? (
                <>
                  <tr>
                    <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">1</td>
                    <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Principal Waiver</td>
                    <td className="py-1 px-3 text-center text-neutral-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">2</td>
                    <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Charged Profit Waiver</td>
                    <td className="py-1 px-3 text-right tabular-nums">{displayAmt(summaryResult.liability.chargedProfit)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">3</td>
                    <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Compensation Waiver (Net of COF)</td>
                    <td className="py-1 px-3 text-right tabular-nums">
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
                    <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">1</td>
                    <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Principal</td>
                    <td className="py-1 px-3 text-center text-neutral-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">2</td>
                    <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Profit</td>
                    <td className="py-1 px-3 text-center text-neutral-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">3</td>
                    <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Gestation Rent</td>
                    <td className="py-1 px-3 text-center text-neutral-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">4</td>
                    <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Charges</td>
                    <td className="py-1 px-3 text-center text-neutral-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">-</td>
                    <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Current Principal (1+2+3+4)</td>
                    <td className="py-1 px-3 text-center text-neutral-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">6</td>
                    <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Compensation</td>
                    <td className="py-1 px-3 text-center text-neutral-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">7</td>
                    <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Uncharged Compensation</td>
                    <td className="py-1 px-3 text-center text-neutral-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-3 text-center border-r border-neutral-200 dark:border-neutral-700">8</td>
                    <td className="py-1 px-3 border-r border-neutral-200 dark:border-neutral-700 font-sans">Uncharged Profit</td>
                    <td className="py-1 px-3 text-center text-neutral-400">-</td>
                  </tr>
                </>
              )}
              <tr className="bg-neutral-50 dark:bg-neutral-850 font-bold font-sans text-xs border-t-2 border-neutral-300 dark:border-neutral-600">
                <td colSpan={2} className="py-2 px-3 border-r border-neutral-200 dark:border-neutral-700">
                  Total Liability (A - B)
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-800 dark:text-emerald-300 text-sm">
                  {displayAmt(summaryResult.waiver.totalWaiverC)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Security Valuation & Legal Position Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Security Valuation */}
          <div className="border border-neutral-300 dark:border-neutral-700 rounded-lg overflow-hidden">
            <div className="bg-[#D9E2F3] dark:bg-blue-950/70 text-blue-950 dark:text-blue-100 font-bold px-3 py-1.5 text-xs">
              Security Valuation by {manual.valuationFirm || 'Survey Firm'} On {manual.valuationDate || '11/11/2026'}
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono text-[11px]">
                <tr>
                  <td className="py-1 px-2 text-center w-8 border-r border-neutral-200 dark:border-neutral-700">1</td>
                  <td className="py-1 px-2.5 font-sans border-r border-neutral-200 dark:border-neutral-700">Market Value (MV)</td>
                  <td className="py-1 px-2.5 text-right tabular-nums">{displayAmt(manual.marketValue)}</td>
                </tr>
                <tr>
                  <td className="py-1 px-2 text-center border-r border-neutral-200 dark:border-neutral-700">2</td>
                  <td className="py-1 px-2.5 font-sans border-r border-neutral-200 dark:border-neutral-700">Forced Sale Value (FSV)</td>
                  <td className="py-1 px-2.5 text-right tabular-nums">{displayAmt(manual.forcedSaleValue)}</td>
                </tr>
                <tr className="bg-neutral-50 dark:bg-neutral-850 font-bold">
                  <td className="py-1 px-2 text-center border-r border-neutral-200 dark:border-neutral-700">3</td>
                  <td className="py-1 px-2.5 font-sans border-r border-neutral-200 dark:border-neutral-700">Liability covered by FSV (%)</td>
                  <td className="py-1 px-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-sans">
                    {manual.liabilityCoveredByFsvPercentManual && !manual.useSuggestedFsvPercent
                      ? `${parseFloat(manual.liabilityCoveredByFsvPercentManual).toFixed(2)}% (Manual)`
                      : fsvPercent > 0
                      ? `${fsvPercent.toFixed(2)}%`
                      : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legal Position */}
          <div className="border border-neutral-300 dark:border-neutral-700 rounded-lg overflow-hidden">
            <div className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold px-3 py-1.5 text-xs border-b border-neutral-200 dark:border-neutral-700">
              Legal Position
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-[11px]">
                <tr>
                  <td className="py-1 px-2 text-center w-8 border-r border-neutral-200 dark:border-neutral-700 font-mono">1</td>
                  <td className="py-1 px-2.5 font-semibold w-28 border-r border-neutral-200 dark:border-neutral-700">NI ACT</td>
                  <td className="py-1 px-2.5 text-neutral-700 dark:text-neutral-300">{manual.legalNiAct ? manual.legalNiAct : '-'}</td>
                </tr>
                <tr>
                  <td className="py-1 px-2 text-center border-r border-neutral-200 dark:border-neutral-700 font-mono">2</td>
                  <td className="py-1 px-2.5 font-semibold border-r border-neutral-200 dark:border-neutral-700">Arthari & Other</td>
                  <td className="py-1 px-2.5 text-neutral-700 dark:text-neutral-300">{manual.legalArthari ? manual.legalArthari : '-'}</td>
                </tr>
                <tr>
                  <td className="py-1 px-2 text-center border-r border-neutral-200 dark:border-neutral-700 font-mono">3</td>
                  <td className="py-1 px-2.5 font-semibold border-r border-neutral-200 dark:border-neutral-700">Other</td>
                  <td className="py-1 px-2.5 text-neutral-700 dark:text-neutral-300">{manual.legalOther ? manual.legalOther : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Special Remarks */}
        <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
          <span className="font-semibold">Special Remarks: </span>
          <span className="italic">{manual.specialRemarks ? manual.specialRemarks : '-'}</span>
        </div>
      </div>
    </div>
  );
};
