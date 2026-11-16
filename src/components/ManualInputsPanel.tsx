import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, Building2, Scale, Shield, FileText, Calculator, Percent } from 'lucide-react';
import { ManualInputs } from '../types';
import { calculateFsvCoveragePercent } from '../engine/summaryEngine';

interface ManualInputsPanelProps {
  manual: ManualInputs;
  onChangeManual: (updated: ManualInputs) => void;
  totalLiabilityA: number;
  onOpenFullTab?: () => void;
  onApplyDefaultCofRate?: (rate: number) => void;
}

export const ManualInputsPanel: React.FC<ManualInputsPanelProps> = ({
  manual,
  onChangeManual,
  totalLiabilityA,
  onOpenFullTab,
  onApplyDefaultCofRate,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const updateField = <K extends keyof ManualInputs>(field: K, value: ManualInputs[K]) => {
    onChangeManual({
      ...manual,
      [field]: value,
    });
  };

  const suggestedPercent = calculateFsvCoveragePercent(manual.forcedSaleValue || 0, totalLiabilityA);

  const handleApplySuggested = () => {
    updateField('liabilityCoveredByFsvPercentManual', suggestedPercent.toFixed(2));
    updateField('useSuggestedFsvPercent', true);
  };

  const handleManualPercentChange = (val: string) => {
    updateField('liabilityCoveredByFsvPercentManual', val);
    updateField('useSuggestedFsvPercent', false);
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 transition-colors">
      <div className="p-4 flex items-center justify-between">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 cursor-pointer select-none group flex-1"
        >
          <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              User Inputs & Parameters
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              MV, FSV, Legal Positions & Remarks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenFullTab && (
            <button
              type="button"
              onClick={onOpenFullTab}
              className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
              title="Switch to dedicated full-width Manual Input tab"
            >
              Open Tab
            </button>
          )}

          <div
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer p-1"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 pt-0 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
          {/* Settlement Summary Default Cost of Fund Rate (%) */}
          <div className="pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" /> Settlement Summary Cost of Fund Rate
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="font-medium text-neutral-700 dark:text-neutral-300">
                Default Cost of Fund Rate (%)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={manual.defaultCofRate ?? '8.98'}
                  onChange={(e) => updateField('defaultCofRate', e.target.value)}
                  className="w-24 px-2.5 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-right font-mono"
                />
                <span className="text-neutral-500 font-semibold">%</span>
                {onApplyDefaultCofRate && (
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseFloat(manual.defaultCofRate ?? '8.98');
                      if (!isNaN(parsed)) onApplyDefaultCofRate(parsed);
                    }}
                    className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                    title="Apply this rate across the COF rate schedule"
                  >
                    Apply to Schedule
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Security Valuation (MV, FSV, FSV Coverage %) */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Security Valuation (Summary Rows 43–46)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Valuation Firm
                </label>
                <input
                  type="text"
                  value={manual.valuationFirm}
                  placeholder="e.g. Apex Surveyors Ltd."
                  onChange={(e) => updateField('valuationFirm', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Valuation Date
                </label>
                <input
                  type="text"
                  value={manual.valuationDate}
                  placeholder="dd/mm/yyyy"
                  onChange={(e) => updateField('valuationDate', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Market Value (MV) BDT
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manual.marketValue ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateField('marketValue', v === '' ? null : parseFloat(v));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-right font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Forced Sale Value (FSV) BDT
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manual.forcedSaleValue ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateField('forcedSaleValue', v === '' ? null : parseFloat(v));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-right font-mono"
                />
              </div>
            </div>

            {/* Liability covered by FSV (%) with distinction between user entry and calculated suggestion */}
            <div className="mt-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Liability covered by FSV (%) — User Input:
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500 font-sans">
                    Calculated Suggestion (FSV / Total A): <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{suggestedPercent > 0 ? `${suggestedPercent.toFixed(2)}%` : '0.00%'}</strong>
                  </span>
                  {suggestedPercent > 0 && (
                    <button
                      type="button"
                      onClick={handleApplySuggested}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                    >
                      <Calculator className="w-3 h-3" />
                      Apply Suggestion
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manual.liabilityCoveredByFsvPercentManual}
                  onChange={(e) => handleManualPercentChange(e.target.value)}
                  placeholder={suggestedPercent > 0 ? `e.g. ${suggestedPercent.toFixed(2)}` : 'e.g. 79.49'}
                  className="w-32 px-2.5 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-right font-mono"
                />
                <span className="text-xs text-neutral-500 font-semibold">%</span>
                <span className="text-[11px] text-neutral-400">
                  {manual.useSuggestedFsvPercent ? '(Using auto-calculated suggestion)' : '(Manual custom user entry)'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Legal Position (NI ACT, Arthari & Other, Other) */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" /> Legal Position (Summary Rows 48–51)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  NI ACT Particulars
                </label>
                <input
                  type="text"
                  value={manual.legalNiAct}
                  onChange={(e) => updateField('legalNiAct', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Arthari & Other Particulars
                </label>
                <input
                  type="text"
                  value={manual.legalArthari}
                  onChange={(e) => updateField('legalArthari', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Other Legal Particulars
                </label>
                <input
                  type="text"
                  value={manual.legalOther}
                  onChange={(e) => updateField('legalOther', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Special Remarks */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Special Remarks (Summary Row 53)
            </label>
            <textarea
              value={manual.specialRemarks}
              rows={2}
              onChange={(e) => updateField('specialRemarks', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          {/* Section 4: Bank Headers & Managing Director */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Institution Header Lines & Officers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-neutral-600 dark:text-neutral-400 mb-1">Bank Name Line 1</label>
                <input
                  type="text"
                  value={manual.bankLine1}
                  onChange={(e) => updateField('bankLine1', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="block text-neutral-600 dark:text-neutral-400 mb-1">Bank Line 2</label>
                <input
                  type="text"
                  value={manual.bankLine2}
                  onChange={(e) => updateField('bankLine2', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="block text-neutral-600 dark:text-neutral-400 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={manual.branchName}
                  onChange={(e) => updateField('branchName', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="block text-neutral-600 dark:text-neutral-400 mb-1">Managing Director</label>
                <input
                  type="text"
                  value={manual.managingDirectorName}
                  placeholder="e.g. A. B. M. Shamsuddin"
                  onChange={(e) => updateField('managingDirectorName', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
