import React, { useRef } from 'react';
import {
  Shield,
  Scale,
  FileText,
  Percent,
  Building2,
  Image as ImageIcon,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { LedgerReport, ManualInputs, RateYear } from '../types';
import { calculateFsvCoveragePercent } from '../engine/summaryEngine';
import { formatBdt } from '../utils/numberUtils';

interface ManualInputTabProps {
  manual: ManualInputs;
  onChangeManual: (updated: ManualInputs) => void;
  totalLiabilityA: number;
  rates: RateYear[];
  onChangeRates: (newRates: RateYear[]) => void;
  missingYears: number[];
  ledgers: LedgerReport[];
  onChangeLedgerLatestDate: (accountNo: string, newDate: string) => void;
  onGoToSummary: () => void;
}

export const ManualInputTab: React.FC<ManualInputTabProps> = ({
  manual,
  onChangeManual,
  totalLiabilityA,
  rates,
  onChangeRates,
  missingYears,
  ledgers,
  onChangeLedgerLatestDate,
  onGoToSummary,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bismillahInputRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof ManualInputs>(field: K, value: ManualInputs[K]) => {
    onChangeManual({
      ...manual,
      [field]: value,
    });
  };

  // Calculation for suggested FSV %
  const suggestedPercent = calculateFsvCoveragePercent(manual.forcedSaleValue || 0, totalLiabilityA);

  const handleApplySuggested = () => {
    updateField('liabilityCoveredByFsvPercentManual', suggestedPercent.toFixed(2));
    updateField('useSuggestedFsvPercent', true);
  };

  const handleManualPercentChange = (val: string) => {
    updateField('liabilityCoveredByFsvPercentManual', val);
    updateField('useSuggestedFsvPercent', false);
  };

  // 2014 & 2015 Rate Handlers
  const handleRate2014Change = (valStr: string) => {
    updateField('rate2014', valStr);
    const parsed = parseFloat(valStr);
    let updated = rates.filter((r) => r.year !== 2014);
    if (!isNaN(parsed) && valStr.trim() !== '') {
      updated.push({ year: 2014, rate: parsed });
    }
    onChangeRates(updated.sort((a, b) => a.year - b.year));
  };

  const handleRate2015Change = (valStr: string) => {
    updateField('rate2015', valStr);
    const parsed = parseFloat(valStr);
    let updated = rates.filter((r) => r.year !== 2015);
    if (!isNaN(parsed) && valStr.trim() !== '') {
      updated.push({ year: 2015, rate: parsed });
    }
    onChangeRates(updated.sort((a, b) => a.year - b.year));
  };

  // Media Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          updateField('bankLogo', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBismillahUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          updateField('bismillahImage', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const is2014Missing = missingYears.includes(2014);
  const is2015Missing = missingYears.includes(2015);

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Session-Persistent Manual Inputs</span>
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">
              Manual Input — Summary & Rate Reference Schedule
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-2xl leading-relaxed">
              Enter manual parameters required to populate the official Settlement Summary and Cost of Fund workbooks. Values entered here automatically map to their designated Excel cells and are retained for your current working session.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoToSummary}
            className="self-start sm:self-center px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>View Summary Output</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid of Input Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Category A: Security Valuation Information */}
        <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                A
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Security Valuation Information
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Directly populates Summary Rows 44, 45, and 46
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. Market Value (MV) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-neutral-800 dark:text-neutral-200">
                  1. Market Value (MV) <span className="font-normal text-neutral-500">(BDT)</span>
                </label>
                {manual.marketValue !== null && manual.marketValue > 0 && (
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                    = {(manual.marketValue / 1000000).toFixed(4)} Million BDT
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                value={manual.marketValue ?? ''}
                placeholder="Leave blank if none (Summary will remain blank)"
                onChange={(e) => {
                  const v = e.target.value;
                  updateField('marketValue', v === '' ? null : parseFloat(v));
                }}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 text-right font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Maps to: <strong className="text-neutral-600 dark:text-neutral-300 font-mono">Summary Row 44 — Market Value (MV)</strong>
              </p>
            </div>

            {/* 2. Forced Sale Value (FSV) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-neutral-800 dark:text-neutral-200">
                  2. Forced Sale Value (FSV) <span className="font-normal text-neutral-500">(BDT)</span>
                </label>
                {manual.forcedSaleValue !== null && manual.forcedSaleValue > 0 && (
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                    = {(manual.forcedSaleValue / 1000000).toFixed(4)} Million BDT
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                value={manual.forcedSaleValue ?? ''}
                placeholder="Leave blank if none (Summary will remain blank)"
                onChange={(e) => {
                  const v = e.target.value;
                  updateField('forcedSaleValue', v === '' ? null : parseFloat(v));
                }}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 text-right font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Maps to: <strong className="text-neutral-600 dark:text-neutral-300 font-mono">Summary Row 45 — Forced Sale Value (FSV)</strong>
              </p>
            </div>

            {/* 3. Liability covered by FSV (%) */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-850/80 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="font-semibold text-neutral-800 dark:text-neutral-200">
                  3. Liability covered by FSV (%)
                </label>

                {suggestedPercent > 0 && (
                  <button
                    type="button"
                    onClick={handleApplySuggested}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Apply Calculated Suggestion</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    value={manual.liabilityCoveredByFsvPercentManual}
                    placeholder={suggestedPercent > 0 ? suggestedPercent.toFixed(2) : 'e.g. 79.49'}
                    onChange={(e) => handleManualPercentChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-right font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-neutral-400 font-bold">%</span>
                </div>

                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                  {manual.useSuggestedFsvPercent ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Auto-calculated suggestion applied
                    </span>
                  ) : manual.liabilityCoveredByFsvPercentManual ? (
                    <span className="text-blue-700 dark:text-blue-400 font-medium">
                      Custom user manual entry preserved (never overwritten)
                    </span>
                  ) : (
                    <span>Left blank: defaults to formula in Summary</span>
                  )}
                </div>
              </div>

              {totalLiabilityA > 0 && (
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
                  <span>Formula: (FSV / Total Liability A) × 100</span>
                  <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">
                    ({formatBdt(manual.forcedSaleValue || 0)} / {formatBdt(totalLiabilityA)}) = {suggestedPercent.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            {/* Valuation Firm & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-neutral-600 dark:text-neutral-400 mb-1">
                  Valuation Firm Name
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
                <label className="block text-neutral-600 dark:text-neutral-400 mb-1">
                  Valuation Date (dd/mm/yyyy)
                </label>
                <input
                  type="text"
                  value={manual.valuationDate}
                  placeholder="dd/mm/yyyy"
                  onChange={(e) => updateField('valuationDate', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Category B & C: Legal Position & Additional Information */}
        <div className="space-y-6">
          {/* Category B: Legal Position Information */}
          <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  B
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Legal Position Information
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Directly populates Summary Rows 49, 50, and 51
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* 1. NI ACT */}
              <div>
                <label className="block font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  1. NI ACT Particulars
                </label>
                <input
                  type="text"
                  value={manual.legalNiAct}
                  placeholder="e.g. CR Case Pending / None (Leave blank if none)"
                  onChange={(e) => updateField('legalNiAct', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Maps to: <strong className="text-neutral-600 dark:text-neutral-300 font-mono">Summary Row 49 — NI ACT</strong>
                </p>
              </div>

              {/* 2. Arthari & Other */}
              <div>
                <label className="block font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  2. Arthari & Other Particulars
                </label>
                <input
                  type="text"
                  value={manual.legalArthari}
                  placeholder="e.g. Artha Rin Suit Filed / None (Leave blank if none)"
                  onChange={(e) => updateField('legalArthari', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Maps to: <strong className="text-neutral-600 dark:text-neutral-300 font-mono">Summary Row 50 — Arthari & Other</strong>
                </p>
              </div>

              {/* 3. Other */}
              <div>
                <label className="block font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  3. Other Legal Particulars
                </label>
                <input
                  type="text"
                  value={manual.legalOther}
                  placeholder="e.g. None / Under negotiations (Leave blank if none)"
                  onChange={(e) => updateField('legalOther', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Maps to: <strong className="text-neutral-600 dark:text-neutral-300 font-mono">Summary Row 51 — Other</strong>
                </p>
              </div>
            </div>
          </section>

          {/* Category C: Additional Information (Special Remarks) */}
          <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  C
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Additional Information
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Directly populates Summary Row 53
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                1. Special Remarks
              </label>
              <textarea
                value={manual.specialRemarks}
                rows={3}
                placeholder="Enter special remarks or waiver conditions. If left blank, the Summary row will remain blank."
                onChange={(e) => updateField('specialRemarks', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Maps to: <strong className="text-neutral-600 dark:text-neutral-300 font-mono">Summary Row 53 — Special Remarks</strong>
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Category D: Rate Reference Schedule — 2014 & 2015 */}
      <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              D
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Rate Reference Schedule — 2014 and 2015 Manual Entry
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Incorporated into the official Rate Reference Schedule (Columns L & M in Cost of Fund)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-500">2016–2026:</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Master Schedule Preserved</span>
          </div>
        </div>

        {/* Policy Instruction Note */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Deterministic Banking Policy for Pre-2016 Rates</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
              Rates for 2014 and 2015 must never be assumed or automatically inserted. If an account ledger has disbursement or transaction periods falling in 2014 or 2015, enter the approved rate below. If missing, the affected calculation will be paused until provided.
            </p>
          </div>
        </div>

        {/* The two required input fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. 2014 — Rate of Cost of Fund */}
          <div className={`p-4 rounded-xl border ${is2014Missing ? 'bg-red-50 dark:bg-red-950/40 border-red-300' : 'bg-neutral-50 dark:bg-neutral-850 border-neutral-200 dark:border-neutral-800'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                1. 2014 — Rate of Cost of Fund (% p.a.)
              </label>
              {is2014Missing && (
                <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Required for 2014 Ledgers
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={manual.rate2014}
                placeholder="Enter rate (e.g. 11.20)"
                onChange={(e) => handleRate2014Change(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-right font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-neutral-500">%</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Applies to all COF calculation periods falling between 01/01/2014 and 31/12/2014.
            </p>
          </div>

          {/* 2. 2015 — Rate of Cost of Fund */}
          <div className={`p-4 rounded-xl border ${is2015Missing ? 'bg-red-50 dark:bg-red-950/40 border-red-300' : 'bg-neutral-50 dark:bg-neutral-850 border-neutral-200 dark:border-neutral-800'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                2. 2015 — Rate of Cost of Fund (% p.a.)
              </label>
              {is2015Missing && (
                <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Required for 2015 Ledgers
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={manual.rate2015}
                placeholder="Enter rate (e.g. 10.85)"
                onChange={(e) => handleRate2015Change(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-right font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-neutral-500">%</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Applies to all COF calculation periods falling between 01/01/2015 and 31/12/2015.
            </p>
          </div>
        </div>
      </section>

      {/* Category E: Bank Institution Details & Media Facilities */}
      <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              E
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Institution Headers & Media Upload Facilities
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Bank logo, Bismillah calligraphy header, and branch metadata
              </p>
            </div>
          </div>
        </div>

        {/* Media Upload Facilities (Bank Logo + Bismillah) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Bank Logo Facility */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                Bank Logo / Emblem
              </label>
              {manual.bankLogo && (
                <button
                  type="button"
                  onClick={() => updateField('bankLogo', null)}
                  className="text-[11px] text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            {manual.bankLogo ? (
              <div className="flex items-center gap-3 p-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <img
                  src={manual.bankLogo}
                  alt="Bank Logo"
                  className="w-12 h-12 object-contain rounded border border-neutral-100 dark:border-neutral-700"
                />
                <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                  <p className="font-semibold text-emerald-600">Logo Loaded</p>
                  <p className="text-neutral-400">Will be embedded into generated Excel sheets.</p>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-neutral-600 dark:text-neutral-400 transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Bank Logo (PNG/JPEG)</span>
                </button>
              </div>
            )}
          </div>

          {/* Bismillah Header Facility */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                Bismillah Calligraphy Header
              </label>
              {manual.bismillahImage && (
                <button
                  type="button"
                  onClick={() => updateField('bismillahImage', null)}
                  className="text-[11px] text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            {manual.bismillahImage ? (
              <div className="flex items-center gap-3 p-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <img
                  src={manual.bismillahImage}
                  alt="Bismillah Header"
                  className="h-10 max-w-[140px] object-contain rounded border border-neutral-100 dark:border-neutral-700"
                />
                <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                  <p className="font-semibold text-emerald-600">Bismillah Header Loaded</p>
                  <p className="text-neutral-400">Placed above Bank Name in official Excel print.</p>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  ref={bismillahInputRef}
                  onChange={handleBismillahUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bismillahInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-neutral-600 dark:text-neutral-400 transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Bismillah Header (PNG/JPEG)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bank Header Text Lines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
          <div>
            <label className="block text-neutral-600 dark:text-neutral-400 mb-1">
              Bank Name (Line 1)
            </label>
            <input
              type="text"
              value={manual.bankLine1}
              onChange={(e) => updateField('bankLine1', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="block text-neutral-600 dark:text-neutral-400 mb-1">
              Bank Line 2
            </label>
            <input
              type="text"
              value={manual.bankLine2}
              onChange={(e) => updateField('bankLine2', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="block text-neutral-600 dark:text-neutral-400 mb-1">
              Branch Name
            </label>
            <input
              type="text"
              value={manual.branchName}
              onChange={(e) => updateField('branchName', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="block text-neutral-600 dark:text-neutral-400 mb-1">
              Managing Director Name
            </label>
            <input
              type="text"
              value={manual.managingDirectorName}
              placeholder="e.g. A. B. M. Shamsuddin"
              onChange={(e) => updateField('managingDirectorName', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
          </div>
        </div>
      </section>

      {/* Category F: Investment Ledger Inputs — Latest Date */}
      <section className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              F
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Investment Ledger Inputs — Latest Date
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Last (most recent) transaction date for each investment ledger account, available as an input for calculations
              </p>
            </div>
          </div>
        </div>

        {ledgers.length === 0 ? (
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
            No investment ledger accounts loaded yet. Upload ledger PDFs or load a sample case to view and edit each account&apos;s Latest Date.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {ledgers.map((ledger, idx) => (
              <div
                key={ledger.accountNo}
                className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                    {idx + 1}. {ledger.accountNo}
                  </span>
                  {ledger.accountType && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium shrink-0">
                      {ledger.accountType}
                    </span>
                  )}
                </div>
                {ledger.accountName && (
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    {ledger.accountName}
                  </p>
                )}
                <div>
                  <label className="block text-neutral-600 dark:text-neutral-400 mb-1">
                    Latest Date (dd/mm/yyyy)
                  </label>
                  <input
                    type="text"
                    value={ledger.lastTxDate}
                    placeholder="dd/mm/yyyy"
                    onChange={(e) => onChangeLedgerLatestDate(ledger.accountNo, e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
