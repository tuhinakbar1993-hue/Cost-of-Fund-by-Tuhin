import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  AlertTriangle,
  FileCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { ValidationPanel } from './components/ValidationPanel';
import { RateSettingsPanel } from './components/RateSettingsPanel';
import { ManualInputsPanel } from './components/ManualInputsPanel';
import { ManualInputTab } from './components/ManualInputTab';
import { CofPreviewTable } from './components/CofPreviewTable';
import { SummaryPreviewTable } from './components/SummaryPreviewTable';
import { TestRunnerModal } from './components/TestRunnerModal';
import {
  LedgerReport,
  OutstandingReport,
  PartyPerformanceReport,
  RateYear,
  ManualInputs,
  UploadedFileStatus,
} from './types';
import {
  calculateAllCof,
  DEFAULT_RATE_TABLE,
} from './engine/cofEngine';
import { calculateSummary } from './engine/summaryEngine';
import { runAuditValidations } from './engine/validations';
import {
  exportBothExcel,
  exportCofExcel,
  exportSummaryExcel,
} from './export/excelExport';
import { getOceanAgroSampleData } from './sample/oceanAgroData';
import { getSaimaAgroSampleData } from './sample/saimaAgroData';
import {
  computeContentHash,
  extractTextFromPdf,
} from './parsers/pdfTextExtractor';
import {
  detectReportType,
  extract13DigitAccountNo,
} from './parsers/fileDetector';
import { parseLedgerReport } from './parsers/ledgerParser';
import { parseOutstandingReport } from './parsers/outstandingParser';
import { parsePartyPerformanceReport } from './parsers/partyPerformanceParser';

import { DeveloperHero } from './components/DeveloperHero';

const LOCAL_STORAGE_RATES_KEY = 'cbs_cof_rates_table_v2';
const LOCAL_STORAGE_MANUAL_KEY = 'cbs_cof_manual_inputs_v2';

const INITIAL_MANUAL_INPUTS: ManualInputs = {
  managingDirectorName: '',
  valuationFirm: 'Apex Valuation & Surveyors Ltd.',
  valuationDate: '11/11/2026',
  marketValue: 850000.00,
  forcedSaleValue: 550000.00,
  liabilityCoveredByFsvPercentManual: '',
  useSuggestedFsvPercent: false,
  legalNiAct: 'CR Case Pending',
  legalArthari: 'Artha Rin Suit Filed',
  legalOther: 'None',
  specialRemarks: 'All calculations strictly based on CBS system records.',
  rate2014: '',
  rate2015: '',
  bankLogo: null,
  bismillahImage: null,
  bankLine1: 'SAMMILITO ISLAMI BANK PLC.',
  bankLine2: '(State-owned Shariah-based Bank)',
  bankLine3: 'UNION BANK UNIT',
  bankLine4: 'Special Assets Management Division',
  branchName: 'EIDGAON BRANCH',
  clientName: 'M/S OCEAN AGRO FARM',
  clStatus: 'BL',
  calculationUpToDate: '05/11/2026',
  showWaiverBreakdown: false,
};

export default function App() {
  // Rates state saved in localStorage
  const [rates, setRates] = useState<RateYear[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_RATES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_RATE_TABLE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_RATES_KEY, JSON.stringify(rates));
    } catch {
      // ignore
    }
  }, [rates]);

  // Core parsed reports state
  const [ledgers, setLedgers] = useState<LedgerReport[]>([]);
  const [outstandingReport, setOutstandingReport] = useState<OutstandingReport | null>(null);
  const [partyPerformance, setPartyPerformance] = useState<PartyPerformanceReport | null>(null);

  // Uploaded files UI chips
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileStatus[]>([]);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [timingMessage, setTimingMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Settings & Manual fields (Preserved during working session)
  const [calculationUpToDate, setCalculationUpToDate] = useState<string>('05/11/2026');
  const [manual, setManual] = useState<ManualInputs>(() => {
    try {
      const saved = sessionStorage.getItem(LOCAL_STORAGE_MANUAL_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_MANUAL_INPUTS;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(LOCAL_STORAGE_MANUAL_KEY, JSON.stringify(manual));
    } catch {
      // ignore
    }
  }, [manual]);

  // Active view tab: COF, Summary, or Dedicated Manual Input tab
  const [activeTab, setActiveTab] = useState<'cof' | 'summary' | 'manual'>('cof');

  // Synchronized Manual inputs handler (syncs 2014 & 2015 rates into Rate Table)
  const handleManualChange = (updated: ManualInputs) => {
    setManual(updated);

    const r14 = parseFloat(updated.rate2014);
    const r15 = parseFloat(updated.rate2015);

    setRates((prev) => {
      let next = prev.filter((r) => r.year !== 2014 && r.year !== 2015);
      if (!isNaN(r14) && updated.rate2014.trim() !== '') {
        next.push({ year: 2014, rate: r14 });
      }
      if (!isNaN(r15) && updated.rate2015.trim() !== '') {
        next.push({ year: 2015, rate: r15 });
      }
      return next.sort((a, b) => a.year - b.year);
    });
  };

  const handleRatesChange = (updatedRates: RateYear[]) => {
    setRates(updatedRates);
    const r14 = updatedRates.find((r) => r.year === 2014);
    const r15 = updatedRates.find((r) => r.year === 2015);
    setManual((prev) => ({
      ...prev,
      rate2014: r14 !== undefined ? String(r14.rate) : prev.rate2014,
      rate2015: r15 !== undefined ? String(r15.rate) : prev.rate2015,
    }));
  };

  // Test modal state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Auto-populate manual inputs whenever reports change
  useEffect(() => {
    if (partyPerformance?.branchName) {
      setManual((m) => ({
        ...m,
        branchName: partyPerformance.branchName,
      }));
    }
    if (outstandingReport?.customerName || partyPerformance?.customerName) {
      setManual((m) => ({
        ...m,
        clientName: outstandingReport?.customerName || partyPerformance?.customerName || m.clientName,
      }));
    }
    if (outstandingReport?.rows && outstandingReport.rows.length > 0) {
      const firstStatus = outstandingReport.rows[0].status;
      if (firstStatus) {
        setManual((m) => ({ ...m, clStatus: firstStatus }));
      }
    }
  }, [partyPerformance, outstandingReport]);

  // Memoized calculations: pure in-memory, executes in < 50ms
  const cofResult = useMemo(() => {
    try {
      return calculateAllCof(ledgers, partyPerformance, rates, calculationUpToDate);
    } catch {
      return calculateAllCof([], partyPerformance, rates, '01/01/2026');
    }
  }, [ledgers, partyPerformance, rates, calculationUpToDate]);

  const summaryResult = useMemo(() => {
    return calculateSummary(outstandingReport, cofResult.surplusDeficit);
  }, [outstandingReport, cofResult.surplusDeficit]);

  const validations = useMemo(() => {
    return runAuditValidations(
      ledgers,
      outstandingReport,
      partyPerformance,
      rates,
      cofResult.missingYears
    );
  }, [ledgers, outstandingReport, partyPerformance, rates, cofResult.missingYears]);

  // Load sample case handler (Ocean Agro Farm)
  const handleLoadSample = () => {
    const t0 = performance.now();
    const sample = getOceanAgroSampleData();

    setLedgers(sample.ledgers);
    setOutstandingReport(sample.outstandingReport);
    setPartyPerformance(sample.partyPerformance);
    setCalculationUpToDate('05/11/2026');

    setUploadedFiles([
      ...sample.ledgers.map((l) => ({
        id: `sample-${l.accountNo}`,
        name: l.fileName,
        size: 45200,
        type: 'INVESTMENT_LEDGER' as const,
        accountNo: l.accountNo,
      })),
      {
        id: 'sample-outstanding',
        name: sample.outstandingReport.fileName,
        size: 38400,
        type: 'CUSTOMER_OUTSTANDING' as const,
      },
      {
        id: 'sample-party-perf',
        name: sample.partyPerformance.fileName,
        size: 41200,
        type: 'PARTY_PERFORMANCE' as const,
      },
    ]);

    setDuplicateCount(0);
    const duration = Math.round(performance.now() - t0);
    setTimingMessage(`Loaded 6 benchmark CBS files in ${duration} ms (Acceptance Case)`);
  };

  // Load sample case handler (Saima Agro Farm - Party Performance Realized 44,949.78)
  const handleLoadSaimaSample = () => {
    const t0 = performance.now();
    const sample = getSaimaAgroSampleData();

    setLedgers(sample.ledgers);
    setOutstandingReport(sample.outstandingReport);
    setPartyPerformance(sample.partyPerformance);
    setCalculationUpToDate('05/11/2026');

    setUploadedFiles([
      ...sample.ledgers.map((l) => ({
        id: `sample-${l.accountNo}`,
        name: l.fileName,
        size: 45200,
        type: 'INVESTMENT_LEDGER' as const,
        accountNo: l.accountNo,
      })),
      {
        id: 'sample-outstanding',
        name: sample.outstandingReport.fileName,
        size: 38400,
        type: 'CUSTOMER_OUTSTANDING' as const,
      },
      {
        id: 'sample-party-perf',
        name: sample.partyPerformance.fileName,
        size: 41200,
        type: 'PARTY_PERFORMANCE' as const,
      },
    ]);

    setDuplicateCount(0);
    const duration = Math.round(performance.now() - t0);
    setTimingMessage(`Loaded Saima Agro Farm sample in ${duration} ms (Realized: BDT 44,949.78)`);
  };

  // Reset to clean slate
  const handleNewCase = () => {
    setLedgers([]);
    setOutstandingReport(null);
    setPartyPerformance(null);
    setUploadedFiles([]);
    setDuplicateCount(0);
    setTimingMessage(null);
    setCalculationUpToDate('05/11/2026');
    setManual(INITIAL_MANUAL_INPUTS);
  };

  // Parallel file selection & parsing in Web Worker / asynchronous extractors
  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const t0 = performance.now();

    const newLedgers: LedgerReport[] = [...ledgers];
    let newOut: OutstandingReport | null = outstandingReport;
    let newPp: PartyPerformanceReport | null = partyPerformance;
    const newChips: UploadedFileStatus[] = [...uploadedFiles];
    let dupsIgnored = 0;

    // Existing hashes & account sets for deduplication
    const seenHashes = new Set(newChips.map((c) => c.id));
    const seenAccounts = new Set(newLedgers.map((l) => l.accountNo));

    // Parallel read of all files
    const parsePromises = files.map(async (file) => {
      try {
        const buffer = await file.arrayBuffer();
        const hash = computeContentHash(buffer);
        const extracted = await extractTextFromPdf(buffer, file.name);
        const reportType = detectReportType(extracted.fullText);
        const accountNo = extract13DigitAccountNo(extracted.fullText) || undefined;

        return {
          file,
          buffer,
          hash,
          extracted,
          reportType,
          accountNo,
          error: null,
        };
      } catch (err: unknown) {
        return {
          file,
          buffer: null,
          hash: file.name + file.size,
          extracted: null,
          reportType: 'UNKNOWN' as const,
          accountNo: undefined,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

    const parsedResults = await Promise.all(parsePromises);

    for (const res of parsedResults) {
      if (res.error) {
        newChips.push({
          id: `${res.file.name}-${Date.now()}`,
          name: res.file.name,
          size: res.file.size,
          type: 'UNKNOWN',
          error: res.error,
        });
        continue;
      }

      // Deduplication check: account number + content hash
      if (res.reportType === 'INVESTMENT_LEDGER' && res.accountNo) {
        if (seenAccounts.has(res.accountNo) || seenHashes.has(res.hash)) {
          dupsIgnored++;
          continue;
        }
        seenAccounts.add(res.accountNo);
      } else if (seenHashes.has(res.hash)) {
        dupsIgnored++;
        continue;
      }

      seenHashes.add(res.hash);

      if (res.extracted) {
        if (res.reportType === 'INVESTMENT_LEDGER') {
          const parsedLedger = parseLedgerReport(res.extracted, res.file.name, res.hash);
          newLedgers.push(parsedLedger);
          newChips.push({
            id: res.hash,
            name: res.file.name,
            size: res.file.size,
            type: 'INVESTMENT_LEDGER',
            accountNo: parsedLedger.accountNo,
          });
        } else if (res.reportType === 'CUSTOMER_OUTSTANDING') {
          newOut = parseOutstandingReport(res.extracted, res.file.name, res.hash);
          newChips.push({
            id: res.hash,
            name: res.file.name,
            size: res.file.size,
            type: 'CUSTOMER_OUTSTANDING',
          });
        } else if (res.reportType === 'PARTY_PERFORMANCE') {
          newPp = parsePartyPerformanceReport(res.extracted, res.file.name, res.hash);
          newChips.push({
            id: res.hash,
            name: res.file.name,
            size: res.file.size,
            type: 'PARTY_PERFORMANCE',
          });
        } else {
          newChips.push({
            id: res.hash,
            name: res.file.name,
            size: res.file.size,
            type: 'UNKNOWN',
            error: 'Unknown CBS report format',
          });
        }
      }
    }

    setLedgers(newLedgers);
    setOutstandingReport(newOut);
    setPartyPerformance(newPp);
    setUploadedFiles(newChips);
    setDuplicateCount((prev) => prev + dupsIgnored);

    const elapsed = Math.round(performance.now() - t0);
    setTimingMessage(`Parsed ${files.length} file${files.length > 1 ? 's' : ''} in ${elapsed} ms`);
    setIsProcessing(false);
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    setLedgers((prev) => prev.filter((l) => l.fileHash !== id && `sample-${l.accountNo}` !== id));
    if (outstandingReport?.fileHash === id || id === 'sample-outstanding') {
      setOutstandingReport(null);
    }
    if (partyPerformance?.fileHash === id || id === 'sample-party-perf') {
      setPartyPerformance(null);
    }
  };

  // Export handlers
  const canExport = cofResult.missingYears.length === 0;

  const handleExportBoth = async () => {
    if (!canExport || isExporting) return;
    setIsExporting(true);
    try {
      await exportBothExcel(cofResult, summaryResult, rates, manual);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCofOnly = async () => {
    if (!canExport || isExporting) return;
    setIsExporting(true);
    try {
      await exportCofExcel(cofResult, rates, manual);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSummaryOnly = async () => {
    if (!canExport || isExporting) return;
    setIsExporting(true);
    try {
      await exportSummaryExcel(summaryResult, cofResult, manual);
    } finally {
      setIsExporting(false);
    }
  };

  const hasData = ledgers.length > 0 || !!outstandingReport || !!partyPerformance;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        onNewCase={handleNewCase}
        onOpenTests={() => setIsTestModalOpen(true)}
        onLoadSample={handleLoadSample}
        hasData={hasData}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Opening Screen — Prominent Developer Information & Official Picture */}
        <DeveloperHero onLoadSample={handleLoadSample} hasData={hasData} />

        {/* Zone 1: Drop Zone & File Management */}
        <section aria-label="File Upload and Detection">
          <DropZone
            files={uploadedFiles}
            onFilesSelected={handleFilesSelected}
            onRemoveFile={handleRemoveFile}
            onLoadSample={handleLoadSample}
            timingMessage={timingMessage}
            duplicateCount={duplicateCount}
            isProcessing={isProcessing}
          />
        </section>

        {/* Zone 2: Workspace Viewport (Tabs + Views) */}
        <div className="space-y-4">
          {/* View Switcher Tabs Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2 gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {/* Tab 1: Cost of Fund */}
              <button
                type="button"
                onClick={() => setActiveTab('cof')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeTab === 'cof'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-850'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Cost of Fund (COF)</span>
                {cofResult.allSegments.length > 0 && (
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-800/80 text-emerald-100 font-mono">
                    {cofResult.allSegments.length} rows
                  </span>
                )}
              </button>

              {/* Tab 2: Settlement Summary */}
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeTab === 'summary'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-850'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Settlement Summary</span>
                {outstandingReport && (
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-800/80 text-emerald-100 font-mono">
                    A/B/C Ready
                  </span>
                )}
              </button>

              {/* Tab 3: Dedicated Manual Input Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeTab === 'manual'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-850'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Manual Input</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-mono">
                  MV / FSV / 2014–15 Rates
                </span>
              </button>
            </div>

            {/* Action Buttons Toolbar on Tab Bar */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                disabled={!canExport || isExporting}
                onClick={handleExportBoth}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                title="Exports both Cost_of_Fund.xlsx and Summary.xlsx with live formulas"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Generating...' : 'Download Both'}</span>
              </button>

              <button
                type="button"
                disabled={!canExport || isExporting}
                onClick={activeTab === 'summary' ? handleExportSummaryOnly : handleExportCofOnly}
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{activeTab === 'summary' ? 'Summary Excel' : 'COF Excel'}</span>
              </button>
            </div>
          </div>

          {/* Missing rates alert banner */}
          {!canExport && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-xs text-red-800 dark:text-red-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  Export is blocked: Missing annual COF rates for year(s){' '}
                  <span className="font-bold underline">{cofResult.missingYears.join(', ')}</span>.
                  {cofResult.missingYears.some((y) => y === 2014 || y === 2015) ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className="ml-2 font-bold underline text-red-700 dark:text-red-300 hover:text-red-950 cursor-pointer"
                    >
                      Open Manual Input Tab to enter pre-2016 rates &rarr;
                    </button>
                  ) : (
                    ' Enter the rate in the sidebar to proceed.'
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Tab Viewport */}
          {activeTab === 'manual' ? (
            /* Dedicated Full-Width Manual Input Tab */
            <ManualInputTab
              manual={manual}
              onChangeManual={handleManualChange}
              totalLiabilityA={summaryResult.liability.totalLiabilityA}
              rates={rates}
              onChangeRates={handleRatesChange}
              missingYears={cofResult.missingYears}
              ledgers={ledgers}
              onChangeLedgerLatestDate={(accountNo, newDate) => {
                setLedgers((prev) =>
                  prev.map((l) =>
                    l.accountNo === accountNo ? { ...l, lastTxDate: newDate } : l
                  )
                );
              }}
              onGoToSummary={() => setActiveTab('summary')}
            />
          ) : (
            /* Dual-column layout for Excel Previews & Quick Sidebar */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              {/* Main Column (Excel Replica Previews) */}
              <div className="lg:col-span-3 space-y-4">
                {activeTab === 'cof' && (
                  <CofPreviewTable
                    cofResult={cofResult}
                    manual={manual}
                    rates={rates}
                  />
                )}

                {activeTab === 'summary' && (
                  <SummaryPreviewTable
                    summaryResult={summaryResult}
                    cofResult={cofResult}
                    manual={manual}
                  />
                )}
              </div>

              {/* Sidebar Column (Rate Settings + Manual Inputs) */}
              <div className="space-y-4">
                <RateSettingsPanel
                  rates={rates}
                  onChangeRates={handleRatesChange}
                  calculationUpToDate={calculationUpToDate}
                  onChangeUpToDate={setCalculationUpToDate}
                  missingYears={cofResult.missingYears}
                  onResetDefaults={() => handleRatesChange(DEFAULT_RATE_TABLE)}
                />

                <ManualInputsPanel
                  manual={manual}
                  onChangeManual={handleManualChange}
                  totalLiabilityA={summaryResult.liability.totalLiabilityA}
                  onOpenFullTab={() => setActiveTab('manual')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Zone 3: Validation Panel & Cross-Report Audit */}
        <section aria-label="Audit Validations" className="pt-2">
          <ValidationPanel validations={validations} />
        </section>
      </main>

      {/* Unit Test Modal */}
      <TestRunnerModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-4 text-center text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Cost of Fund by Tuhin · Mohammad Towhidul Akbar Tuhin · Sammilito Islami Bank PLC · Special Assets Management Division</span>
          <span className="text-[11px] text-neutral-400">
            100% Client-Side · Zero Data Transmission · Deterministic Financial Math
          </span>
        </div>
      </footer>
    </div>
  );
}
