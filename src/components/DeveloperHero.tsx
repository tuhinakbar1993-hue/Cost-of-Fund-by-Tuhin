import React from 'react';
import { Award, Briefcase, GraduationCap, Sparkles, ShieldCheck } from 'lucide-react';

interface DeveloperHeroProps {
  onLoadSample: () => void;
  hasData: boolean;
}

export const DeveloperHero: React.FC<DeveloperHeroProps> = ({ onLoadSample, hasData }) => {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950 text-white border border-neutral-800 shadow-md">
      {/* Subtle background ornamentation */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_50%)] pointer-events-none" />

      <div className="relative p-6 sm:p-8 lg:p-9 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 md:gap-8">
        {/* Left / Center Info */}
        <div className="space-y-4 max-w-2xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Special Assets Management Division · Banking CBS Engine</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-sans">
              Cost of Fund by Tuhin
            </h1>
            <p className="text-sm sm:text-base text-neutral-300 mt-1.5 leading-relaxed font-sans">
              Deterministic, audit-ready Cost of Fund (COF) calculation & Settlement Summary generator for core banking PDF reports.
            </p>
          </div>

          {/* Developer Card Badge */}
          <div className="pt-2 border-t border-neutral-800/90 flex flex-col sm:flex-row items-center md:items-start gap-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold tracking-wide uppercase text-[11px]">
                <Award className="w-3.5 h-3.5" />
                <span>Software Developer</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Mohammad Towhidul Akbar Tuhin
              </h2>
              <div className="flex items-center gap-1.5 text-neutral-300 text-xs">
                <Briefcase className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  Officer, <strong className="text-white">Sammilito Islami Bank PLC</strong>
                  <span className="text-neutral-400 block sm:inline sm:ml-1">
                    (Transferee of Assets & Liabilities of Union Bank PLC)
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-neutral-400 text-xs pt-0.5">
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  BBA, Heriot Watt University, UK
                </span>
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span>MBA, University of Chittagong</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Official Developer Picture Presentation */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="relative group">
            {/* Elegant framing with border glow */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-400 opacity-70 blur-xs group-hover:opacity-100 transition duration-300" />
            <div className="relative w-36 h-44 sm:w-40 sm:h-48 rounded-xl overflow-hidden border-2 border-emerald-400/60 bg-neutral-900 shadow-xl">
              <img
                src="/assets/aistudio/Tuhin_Pic_6c5894de.jpeg"
                alt="Mohammad Towhidul Akbar Tuhin - Officer, Sammilito Islami Bank PLC"
                className="w-full h-full object-cover object-top"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <span className="text-[11px] font-medium text-emerald-400 mt-2 tracking-wide font-sans">
            Mohammad Towhidul Akbar Tuhin
          </span>
        </div>
      </div>
    </section>
  );
};
