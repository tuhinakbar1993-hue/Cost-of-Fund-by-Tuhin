import React from 'react';
import { FileSpreadsheet, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';

interface HeaderProps {
  onNewCase: () => void;
  onOpenTests: () => void;
  onLoadSample: () => void;
  hasData: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNewCase,
  onOpenTests,
  onLoadSample,
  hasData,
}) => {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap leading-tight">
              Cost of Fund by Tuhin
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
              Special Assets Management Division · CBS Client-Side Engine
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation / Information links */}
        <div className="hidden md:flex items-center gap-6 text-xs text-neutral-500 dark:text-neutral-400">
          <span>Zero Server Uploads</span>
          <span aria-hidden="true">·</span>
          <span>Strict UTC Date Math</span>
          <span aria-hidden="true">·</span>
          <span>Audit-Ready Excel Formulas</span>
        </div>

        {/* Zone 3: Quick Action buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {!hasData && (
            <button
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Loads acceptance test case: Ocean Agro Farm with 4 accounts"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Load Sample Case
            </button>
          )}

          <button
            onClick={onOpenTests}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" />
            Run Unit Tests
          </button>

          {hasData && (
            <button
              onClick={onNewCase}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Clears all loaded files and resets state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Case
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
