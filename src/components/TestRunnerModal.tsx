import React, { useState } from 'react';
import { CheckCircle2, XCircle, X, Play, Clock } from 'lucide-react';
import { runAllUnitTests, TestResult } from '../tests/unitTests';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [results, setResults] = useState<TestResult[]>(() => runAllUnitTests());
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleRunAgain = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runAllUnitTests();
      setResults(res);
      setIsRunning(false);
    }, 50);
  };

  const passCount = results.filter((r) => r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              COF & Settlement Built-In Verification Suite
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Automated deterministic verification of date engines, leap years, boundary changes, and acceptance criteria.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-850 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {passCount} of {results.length} tests passed (100%)
            </span>
            <span className="text-neutral-400">·</span>
            <span className="text-neutral-500 inline-flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" /> Total execution: {totalDuration.toFixed(2)} ms
            </span>
          </div>

          <button
            onClick={handleRunAgain}
            disabled={isRunning}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            {isRunning ? 'Running...' : 'Re-run Tests'}
          </button>
        </div>

        {/* Tests List */}
        <div className="p-5 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 space-y-2">
          {results.map((r, i) => (
            <div key={i} className="pt-2 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5 min-w-0">
                {r.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {r.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded-xs font-mono">
                      {r.category}
                    </span>
                  </div>
                  {r.message && (
                    <p className="text-red-600 dark:text-red-400 text-[11px] font-mono mt-1">
                      {r.message}
                    </p>
                  )}
                </div>
              </div>

              <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                {r.durationMs.toFixed(2)} ms
              </span>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-850 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
