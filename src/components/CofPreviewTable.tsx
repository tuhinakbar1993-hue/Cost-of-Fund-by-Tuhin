import React from 'react';
import {
  CofCalculationResult,
  ManualInputs,
  RateYear,
} from '../types';
import { formatBdt } from '../utils/numberUtils';

interface CofPreviewTableProps {
  cofResult: CofCalculationResult;
  manual: ManualInputs;
  rates: RateYear[];
}

export const CofPreviewTable: React.FC<CofPreviewTableProps> = ({
  cofResult,
  manual,
  rates,
}) => {
  const bankName = manual.bankLine1 || 'Union Bank PLC.';
  const clientName = (manual.clientName || 'M/S OCEAN AGRO FARM').toUpperCase();
  const clStatus = manual.clStatus || 'BL';
  const branchName = manual.branchName || 'EIDGAON BRANCH';
  const asOnDate = cofResult.calculationUpToDate || '05/11/2026';

  return (
    <div className="space-y-6">
      {/* Table Container with clean spreadsheet appearance */}
      <div className="border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
        {/* Spreadsheet Header Titles */}
        <div className="text-center py-6 px-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850 font-serif">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {bankName}
          </h2>
          <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 mt-1">
            {clientName} (CL Status: {clStatus}) – {branchName}
          </h3>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mt-0.5">
            Cost of Fund (as on {asOnDate.replace(/\//g, '.')})
          </p>
        </div>

        {/* The Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-serif border-collapse">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-b border-neutral-300 dark:border-neutral-700">
                <th className="py-2.5 px-2 border-r border-neutral-300 dark:border-neutral-700 text-center font-bold w-12">
                  Serial No
                </th>
                <th className="py-2.5 px-3 border-r border-neutral-300 dark:border-neutral-700 text-center font-bold">
                  Account No
                </th>
                <th className="py-2.5 px-3 border-r border-neutral-300 dark:border-neutral-700 text-center font-bold">
                  Disbursment Date
                </th>
                <th className="py-2.5 px-3 border-r border-neutral-300 dark:border-neutral-700 text-center font-bold">
                  Adjustment Date
                </th>
                <th className="py-2.5 px-2.5 border-r border-neutral-300 dark:border-neutral-700 text-center font-bold">
                  Effective Days
                </th>
                <th className="py-2.5 px-3.5 border-r border-neutral-300 dark:border-neutral-700 text-right font-bold">
                  Principal
                </th>
                <th className="py-2.5 px-2.5 border-r border-neutral-300 dark:border-neutral-700 text-center font-bold">
                  Rate of Cost of Fund
                </th>
                <th className="py-2.5 px-2.5 border-r border-neutral-300 dark:border-neutral-700 text-right font-bold">
                  Time Period (In Year)
                </th>
                <th className="py-2.5 px-3.5 text-right font-bold">
                  Cost of Fund
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
              {cofResult.accountSummaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-500 font-sans italic">
                    No accounts or ledger reports uploaded yet. Drop in CBS PDF reports or load the sample case above.
                  </td>
                </tr>
              ) : (
                cofResult.accountSummaries.map((acc, accIdx) => {
                  const segments = acc.segments;
                  return segments.map((seg, segIdx) => {
                    const isFirstOfAcc = segIdx === 0;

                    return (
                      <tr
                        key={`${seg.accountNo}-${seg.segmentIndex}`}
                        className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/60 transition-colors font-mono text-[11px]"
                      >
                        {/* Merged Serial No for first row */}
                        {isFirstOfAcc && (
                          <td
                            rowSpan={segments.length}
                            className="py-2 px-2 border-r border-neutral-300 dark:border-neutral-700 text-center font-semibold bg-neutral-50/30 dark:bg-neutral-900/40 align-middle"
                          >
                            {accIdx + 1}
                          </td>
                        )}

                        {/* Merged Account No for first row */}
                        {isFirstOfAcc && (
                          <td
                            rowSpan={segments.length}
                            className="py-2 px-3 border-r border-neutral-300 dark:border-neutral-700 text-center font-bold tracking-wider bg-neutral-50/30 dark:bg-neutral-900/40 align-middle"
                          >
                            {acc.accountNo}
                          </td>
                        )}

                        {/* Start Date */}
                        <td className="py-1.5 px-3 border-r border-neutral-300 dark:border-neutral-700 text-center">
                          {seg.startDate}
                        </td>

                        {/* End Date */}
                        <td className="py-1.5 px-3 border-r border-neutral-300 dark:border-neutral-700 text-center">
                          {seg.endDate}
                        </td>

                        {/* Effective Days */}
                        <td
                          className="py-1.5 px-2.5 border-r border-neutral-300 dark:border-neutral-700 text-center tabular-nums"
                          title="Formula: EndDate - StartDate + 1"
                        >
                          {seg.effectiveDays}
                        </td>

                        {/* Principal */}
                        <td className="py-1.5 px-3.5 border-r border-neutral-300 dark:border-neutral-700 text-right tabular-nums">
                          {formatBdt(seg.principal)}
                        </td>

                        {/* Rate */}
                        <td className="py-1.5 px-2.5 border-r border-neutral-300 dark:border-neutral-700 text-center tabular-nums">
                          {seg.rate.toFixed(2)}
                        </td>

                        {/* Time Period (In Year) */}
                        <td
                          className="py-1.5 px-2.5 border-r border-neutral-300 dark:border-neutral-700 text-right tabular-nums text-neutral-600 dark:text-neutral-400"
                          title="Formula: EffectiveDays / 365"
                        >
                          {seg.timePeriodYears.toFixed(4)}
                        </td>

                        {/* Cost of Fund Amount */}
                        <td
                          className="py-1.5 px-3.5 text-right tabular-nums font-semibold text-neutral-900 dark:text-neutral-100"
                          title="Formula: Principal * Rate * Years / 100"
                        >
                          {formatBdt(seg.cofAmount)}
                        </td>
                      </tr>
                    );
                  });
                })
              )}

              {/* Total Row 1 */}
              {cofResult.allSegments.length > 0 && (
                <>
                  <tr className="bg-neutral-100 dark:bg-neutral-800 font-bold border-t-2 border-neutral-400 dark:border-neutral-600 text-xs">
                    <td className="py-2.5 px-2 text-center border-r border-neutral-300 dark:border-neutral-700">
                      Total
                    </td>
                    <td colSpan={6} className="border-r border-neutral-300 dark:border-neutral-700" />
                    <td className="py-2.5 px-2.5 text-center border-r border-neutral-300 dark:border-neutral-700">
                      Cost of Fund
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-emerald-800 dark:text-emerald-300 text-sm">
                      {formatBdt(cofResult.totalCof)}
                    </td>
                  </tr>

                  {/* Total Row 2 (re-confirmation line as in official template) */}
                  <tr className="bg-neutral-50 dark:bg-neutral-850 font-bold border-t border-neutral-300 dark:border-neutral-700 text-xs">
                    <td colSpan={6} className="border-r border-neutral-300 dark:border-neutral-700" />
                    <td className="py-2 px-2.5 text-center border-r border-neutral-300 dark:border-neutral-700">
                      Total
                    </td>
                    <td className="border-r border-neutral-300 dark:border-neutral-700" />
                    <td className="py-2 px-3.5 text-right font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                      {formatBdt(cofResult.totalCof)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Note row */}
        {cofResult.allSegments.length > 0 && (
          <div className="p-3 bg-neutral-50 dark:bg-neutral-850 border-t border-neutral-200 dark:border-neutral-800 text-xs italic text-neutral-600 dark:text-neutral-400">
            {cofResult.noteText}
          </div>
        )}
      </div>

      {/* Audit Notes Block & Rate Reference Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Notes Summary Box */}
        <div className="md:col-span-2 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 p-5 space-y-3 font-serif">
          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-sans border-b border-neutral-100 dark:border-neutral-800 pb-2">
            Notes & Realization Cross-Reconciliation
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-700 dark:text-neutral-300">Cost of Fund:</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                BDT {formatBdt(cofResult.totalCof)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
              <div className="text-neutral-700 dark:text-neutral-300">
                <span>Total already realized (Profit + Compensation):</span>
                <span className="block text-[11px] text-neutral-400 font-sans">
                  Formula: {formatBdt(cofResult.profitRecovery)} + {formatBdt(cofResult.compensationRecovery)}
                </span>
              </div>
              <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                BDT {formatBdt(cofResult.totalAlreadyRealized)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 pt-2 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                  Surplus / Deficit of realization over cost of fund:
                </span>
                <span className="block text-[11px] text-emerald-700/80 dark:text-emerald-400 font-sans">
                  Carried into Settlement Summary B.3
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-900 dark:text-emerald-100 text-base tabular-nums">
                BDT {formatBdt(cofResult.surplusDeficit)}
              </span>
            </div>
          </div>
        </div>

        {/* Rate Reference Card */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 p-5 space-y-3 font-sans">
          <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800 pb-2">
            Rate Reference Schedule
          </h4>
          <div className="max-h-48 overflow-y-auto space-y-1 text-xs font-mono pr-1">
            {rates.map((r) => (
              <div key={r.year} className="flex items-center justify-between py-0.5 text-neutral-600 dark:text-neutral-400">
                <span>{r.year}</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {r.rate.toFixed(2)}% {r.provisional && '(Prov.)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
