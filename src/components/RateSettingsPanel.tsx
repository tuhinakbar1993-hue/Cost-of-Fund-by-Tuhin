import React, { useState } from 'react';
import { Percent, Plus, RotateCcw, Calendar, AlertTriangle } from 'lucide-react';
import { RateYear } from '../types';

interface RateSettingsPanelProps {
  rates: RateYear[];
  onChangeRates: (newRates: RateYear[]) => void;
  calculationUpToDate: string;
  onChangeUpToDate: (date: string) => void;
  missingYears: number[];
  onResetDefaults: () => void;
}

export const RateSettingsPanel: React.FC<RateSettingsPanelProps> = ({
  rates,
  onChangeRates,
  calculationUpToDate,
  onChangeUpToDate,
  missingYears,
  onResetDefaults,
}) => {
  const [newYearInput, setNewYearInput] = useState('');
  const [newRateInput, setNewRateInput] = useState('');

  const handleRateChange = (year: number, valStr: string) => {
    const val = parseFloat(valStr);
    const updated = rates.map((r) =>
      r.year === year ? { ...r, rate: isNaN(val) ? 0 : val } : r
    );
    onChangeRates(updated);
  };

  const handleProvisionalToggle = (year: number) => {
    const updated = rates.map((r) =>
      r.year === year ? { ...r, provisional: !r.provisional } : r
    );
    onChangeRates(updated);
  };

  const handleAddYear = (e: React.FormEvent) => {
    e.preventDefault();
    const y = parseInt(newYearInput, 10);
    const r = parseFloat(newRateInput);
    if (!isNaN(y) && !isNaN(r) && y > 1990 && y < 2100) {
      if (!rates.some((item) => item.year === y)) {
        const updated = [...rates, { year: y, rate: r }].sort((a, b) => a.year - b.year);
        onChangeRates(updated);
        setNewYearInput('');
        setNewRateInput('');
      }
    }
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 p-4 transition-colors space-y-4">
      {/* Settings Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Cost of Fund Parameters
          </h2>
        </div>
        <button
          type="button"
          onClick={onResetDefaults}
          className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 inline-flex items-center gap-1 transition-colors cursor-pointer"
          title="Reset to official benchmark rates"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Calculated Up To Date */}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          COF Calculated Up To Date
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={calculationUpToDate}
            onChange={(e) => onChangeUpToDate(e.target.value)}
            placeholder="dd/mm/yyyy"
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
          End date for final segment (Default: Print Date from CBS reports).
        </p>
      </div>

      {/* Missing Year Alert */}
      {missingYears.length > 0 && (
        <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Missing Rate Table Coverage</p>
            <p className="text-[11px] mt-0.5">
              Years required but missing: <span className="font-bold">{missingYears.join(', ')}</span>. Export is blocked until entered.
            </p>
          </div>
        </div>
      )}

      {/* Editable Rates Table */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
          <span>Annual COF Rate Table (%)</span>
          <span className="text-[11px] font-normal text-neutral-500">Provisional?</span>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-neutral-100 dark:border-neutral-800 rounded-lg p-2">
          {rates.map((r) => {
            const isMissing = missingYears.includes(r.year);

            return (
              <div
                key={r.year}
                className={`flex items-center justify-between gap-2 p-1.5 rounded-md text-xs font-mono ${
                  isMissing
                    ? 'bg-red-100/70 dark:bg-red-950/50 border border-red-300'
                    : 'bg-neutral-50 dark:bg-neutral-850'
                }`}
              >
                <span className="font-bold text-neutral-800 dark:text-neutral-200 w-12">
                  {r.year}
                </span>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={r.rate}
                    onChange={(e) => handleRateChange(r.year, e.target.value)}
                    className="w-18 px-2 py-0.5 text-xs text-right rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-neutral-500">%</span>
                </div>

                <label className="flex items-center gap-1 cursor-pointer text-[11px] text-neutral-600 dark:text-neutral-400 select-none">
                  <input
                    type="checkbox"
                    checked={!!r.provisional}
                    onChange={() => handleProvisionalToggle(r.year)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Prov.</span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Year Form */}
      <form onSubmit={handleAddYear} className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
        <input
          type="number"
          placeholder="Year"
          value={newYearInput}
          onChange={(e) => setNewYearInput(e.target.value)}
          className="w-18 px-2 py-1 text-xs font-mono rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Rate %"
          value={newRateInput}
          onChange={(e) => setNewRateInput(e.target.value)}
          className="w-20 px-2 py-1 text-xs font-mono rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
        />
        <button
          type="submit"
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </form>
    </div>
  );
};
