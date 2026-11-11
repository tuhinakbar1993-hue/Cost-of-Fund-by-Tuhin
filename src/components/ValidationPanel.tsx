import React, { useState } from 'react';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { ValidationItem } from '../types';

interface ValidationPanelProps {
  validations: ValidationItem[];
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ validations }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const passCount = validations.filter((v) => v.passed).length;
  const allPass = passCount === validations.length;

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 p-4 transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${allPass ? 'text-emerald-600' : 'text-amber-500'}`} />
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            CBS Financial Audit Validation Panel
          </h2>
        </div>
        <div className="text-xs font-semibold">
          <span className={allPass ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
            {passCount} of {validations.length} checks passing
          </span>
        </div>
      </div>

      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 mt-1">
        {validations.map((val) => {
          const isExpanded = expandedId === val.id;

          return (
            <div key={val.id} className="py-2.5">
              <div
                onClick={() => toggleExpand(val.id)}
                className="flex items-start justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {val.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle
                        className={`w-4 h-4 ${
                          val.isFatal ? 'text-red-600 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'
                        }`}
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {val.title}
                      </p>
                      {val.isFatal && !val.passed && (
                        <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/70 px-1.5 py-0.2 rounded-xs">
                          Blocks Export
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                      {val.description}
                    </p>
                  </div>
                </div>

                <div className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition-colors shrink-0 pt-0.5">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Collapsible Details */}
              {isExpanded && val.details && val.details.length > 0 && (
                <div className="mt-2.5 ml-6.5 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-700 dark:text-neutral-300 font-mono space-y-1">
                  {val.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-1.5">
                      <span className="text-neutral-400 select-none">•</span>
                      <span className="break-words leading-relaxed">{detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
