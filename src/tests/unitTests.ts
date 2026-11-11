/**
 * Comprehensive Unit Test Suite.
 * Covers:
 * 1. Date math & Leap year interval handling (always / 365)
 * 2. Segment engine: multi-year splits, 1 Jan principal changes, fully-repaid accounts
 * 3. Parser text detection and line reconstruction
 * 4. Summary formulas & FSV coverage
 * 5. Full acceptance test end-to-end verification
 */

import {
  calculateAccountCof,
  calculateAllCof,
  DEFAULT_RATE_TABLE,
} from '../engine/cofEngine';
import {
  calculateFsvCoveragePercent,
  calculateSummary,
} from '../engine/summaryEngine';
import { runAuditValidations } from '../engine/validations';
import { detectReportType } from '../parsers/fileDetector';
import { groupItemsIntoLines } from '../parsers/ledgerParser';
import { getOceanAgroSampleData } from '../sample/oceanAgroData';
import { LedgerReport } from '../types';
import {
  getInclusiveDays,
  parseDateToUtcDay,
  splitIntervalByCalendarYears,
} from '../utils/dateUtils';
import { round2 } from '../utils/numberUtils';

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

export function runAllUnitTests(): TestResult[] {
  const results: TestResult[] = [];

  const runTest = (category: string, name: string, fn: () => void) => {
    const t0 = performance.now();
    try {
      fn();
      results.push({
        name,
        category,
        passed: true,
        durationMs: round2(performance.now() - t0),
      });
    } catch (err: unknown) {
      results.push({
        name,
        category,
        passed: false,
        message: err instanceof Error ? err.message : String(err),
        durationMs: round2(performance.now() - t0),
      });
    }
  };

  // -------------------------------------------------------------
  // Category 1: Date & Leap Year Math
  // -------------------------------------------------------------
  runTest('Date Engine', 'Leap year 2020 has 366 days and divides by 365', () => {
    const start2020 = parseDateToUtcDay('01/01/2020');
    const end2020 = parseDateToUtcDay('31/12/2020');
    const days = getInclusiveDays(start2020, end2020);
    if (days !== 366) throw new Error(`Expected 366 days in 2020, got ${days}`);
    const timePeriod = days / 365;
    if (Math.abs(timePeriod - 1.0027397) > 0.0001) {
      throw new Error(`Expected time period ~1.0027, got ${timePeriod}`);
    }
  });

  runTest('Date Engine', 'Interval splitting across calendar year ends (31 Dec / 1 Jan)', () => {
    const start = parseDateToUtcDay('25/04/2019');
    const end = parseDateToUtcDay('16/04/2024');
    const segs = splitIntervalByCalendarYears(start, end);
    if (segs.length !== 6) throw new Error(`Expected 6 segments, got ${segs.length}`);
    if (segs[0].year !== 2019 || segs[0].effectiveDays !== 251) {
      throw new Error(`2019 segment days mismatch: ${segs[0].effectiveDays}`);
    }
    if (segs[1].year !== 2020 || segs[1].effectiveDays !== 366) {
      throw new Error(`2020 leap year segment days mismatch: ${segs[1].effectiveDays}`);
    }
    if (segs[5].year !== 2024 || segs[5].effectiveDays !== 107) {
      throw new Error(`2024 segment days mismatch: ${segs[5].effectiveDays}`);
    }
  });

  // -------------------------------------------------------------
  // Category 2: Segment Engine Edge Cases
  // -------------------------------------------------------------
  runTest('Segment Engine', 'Principal change occurs exactly on 1 Jan', () => {
    const ledger: LedgerReport = {
      accountNo: '1111111111111',
      accountName: 'Test 1 Jan Change',
      accountType: 'MPI',
      openingDate: '01/01/2022',
      expiryDate: '01/01/2025',
      lastTxDate: '01/01/2023',
      fileName: 'test.pdf',
      fileHash: 'h1',
      transactions: [
        {
          date: '01/01/2022',
          dateUtcDay: parseDateToUtcDay('01/01/2022'),
          debitPrincipal: 100000,
          debitGestation: 0,
          debitProfit: 0,
          debitCompensation: 0,
          debitCharge: 0,
          creditPrincipal: 0,
          creditGestation: 0,
          creditProfit: 0,
          creditCompensation: 0,
          creditCharge: 0,
          balancePrincipal: 100000,
          balanceGestation: 0,
          balanceProfit: 0,
          balanceCompensation: 0,
          balanceCharge: 0,
        },
        {
          date: '01/01/2023',
          dateUtcDay: parseDateToUtcDay('01/01/2023'),
          debitPrincipal: 0,
          debitGestation: 0,
          debitProfit: 0,
          debitCompensation: 0,
          debitCharge: 0,
          creditPrincipal: 50000,
          creditGestation: 0,
          creditProfit: 0,
          creditCompensation: 0,
          creditCharge: 0,
          balancePrincipal: 50000,
          balanceGestation: 0,
          balanceProfit: 0,
          balanceCompensation: 0,
          balanceCharge: 0,
        },
      ],
      totalDebitPrincipal: 100000,
      totalDebitGestation: 0,
      totalDebitProfit: 0,
      totalDebitCompensation: 0,
      totalDebitCharge: 0,
      totalCreditPrincipal: 50000,
      totalCreditGestation: 0,
      totalCreditProfit: 0,
      totalCreditCompensation: 0,
      totalCreditCharge: 0,
      finalPrincipalBalance: 50000,
    };

    const rateMap = new Map([[2022, 10.0], [2023, 10.0]]);
    const res = calculateAccountCof(
      ledger,
      1,
      parseDateToUtcDay('31/12/2023'),
      rateMap,
      { value: 0 }
    );

    // Segment 1: 01/01/2022 to 31/12/2022 (365 days, 100,000)
    // Segment 2: 01/01/2023 to 31/12/2023 (365 days, 50,000)
    if (res.summary.segments.length !== 2) {
      throw new Error(`Expected 2 segments for 1 Jan change, got ${res.summary.segments.length}`);
    }
    if (res.summary.segments[0].principal !== 100000) {
      throw new Error(`First segment principal should be 100000`);
    }
    if (res.summary.segments[1].principal !== 50000) {
      throw new Error(`Second segment principal should be 50000`);
    }
  });

  runTest('Segment Engine', 'Fully-repaid account stops when principal reaches 0', () => {
    const ledger: LedgerReport = {
      accountNo: '2222222222222',
      accountName: 'Fully Repaid Account',
      accountType: 'MPI',
      openingDate: '01/01/2022',
      expiryDate: '01/01/2023',
      lastTxDate: '01/07/2022',
      fileName: 'repaid.pdf',
      fileHash: 'h2',
      transactions: [
        {
          date: '01/01/2022',
          dateUtcDay: parseDateToUtcDay('01/01/2022'),
          debitPrincipal: 100000,
          debitGestation: 0,
          debitProfit: 0,
          debitCompensation: 0,
          debitCharge: 0,
          creditPrincipal: 0,
          creditGestation: 0,
          creditProfit: 0,
          creditCompensation: 0,
          creditCharge: 0,
          balancePrincipal: 100000,
          balanceGestation: 0,
          balanceProfit: 0,
          balanceCompensation: 0,
          balanceCharge: 0,
        },
        {
          date: '01/07/2022',
          dateUtcDay: parseDateToUtcDay('01/07/2022'),
          debitPrincipal: 0,
          debitGestation: 0,
          debitProfit: 0,
          debitCompensation: 0,
          debitCharge: 0,
          creditPrincipal: 100000,
          creditGestation: 0,
          creditProfit: 0,
          creditCompensation: 0,
          creditCharge: 0,
          balancePrincipal: 0, // Fully repaid!
          balanceGestation: 0,
          balanceProfit: 0,
          balanceCompensation: 0,
          balanceCharge: 0,
        },
      ],
      totalDebitPrincipal: 100000,
      totalDebitGestation: 0,
      totalDebitProfit: 0,
      totalDebitCompensation: 0,
      totalDebitCharge: 0,
      totalCreditPrincipal: 100000,
      totalCreditGestation: 0,
      totalCreditProfit: 0,
      totalCreditCompensation: 0,
      totalCreditCharge: 0,
      finalPrincipalBalance: 0,
    };

    const rateMap = new Map([[2022, 10.0], [2023, 10.0]]);
    const res = calculateAccountCof(
      ledger,
      1,
      parseDateToUtcDay('31/12/2023'),
      rateMap,
      { value: 0 }
    );

    // Only 1 segment should exist: 01/01/2022 to 30/06/2022 (day before repayment).
    // After principal becomes 0 on 01/07/2022, calculation MUST stop.
    if (res.summary.segments.length !== 1) {
      throw new Error(
        `Expected 1 segment for repaid account, got ${res.summary.segments.length}`
      );
    }
    if (res.summary.segments[0].endDate !== '30/06/2022') {
      throw new Error(`Repaid segment should end 30/06/2022, got ${res.summary.segments[0].endDate}`);
    }
  });

  runTest('Segment Engine', 'Missing year in rate table is detected', () => {
    const { ledgers } = getOceanAgroSampleData();
    // Only rates for 2019-2023 (missing 2024, 2025, 2026)
    const partialRates = DEFAULT_RATE_TABLE.filter((r) => r.year <= 2023);
    const res = calculateAllCof(ledgers, null, partialRates, '05/11/2026');
    if (res.missingYears.length === 0) {
      throw new Error(`Expected missing years to be flagged`);
    }
    if (!res.missingYears.includes(2024) || !res.missingYears.includes(2025)) {
      throw new Error(`Missing years should contain 2024 and 2025`);
    }
  });

  // -------------------------------------------------------------
  // Category 3: Parser & Text Detection
  // -------------------------------------------------------------
  runTest('Parser', 'Report type auto-detection by content', () => {
    const t1 = 'BANK CBS - Investment Ledger Report - Account 0547100001346';
    const t2 = 'BRANCH REPORT - Customer Outstanding Report - Grand Total';
    const t3 = 'Performence Report of M/S OCEAN AGRO FARM';
    const t4 = 'Unknown Document Content';

    if (detectReportType(t1) !== 'INVESTMENT_LEDGER') throw new Error('Failed to detect Ledger');
    if (detectReportType(t2) !== 'CUSTOMER_OUTSTANDING') throw new Error('Failed to detect Outstanding');
    if (detectReportType(t3) !== 'PARTY_PERFORMANCE') throw new Error('Failed to detect Party Performance');
    if (detectReportType(t4) !== 'UNKNOWN') throw new Error('Failed unknown fallback');
  });

  runTest('Parser', 'Line grouping with y-tolerance and x-sorting', () => {
    const items = [
      { str: 'Col1', x: 10, y: 500.2, width: 20, height: 10 },
      { str: 'Col3', x: 80, y: 500.8, width: 20, height: 10 },
      { str: 'Col2', x: 45, y: 499.9, width: 20, height: 10 },
      { str: 'NextRow', x: 10, y: 480.0, width: 30, height: 10 },
    ];
    const lines = groupItemsIntoLines(items, 2.5);
    if (lines.length !== 2) throw new Error(`Expected 2 lines, got ${lines.length}`);
    if (lines[0].items[0].str !== 'Col1' || lines[0].items[1].str !== 'Col2' || lines[0].items[2].str !== 'Col3') {
      throw new Error(`Items not sorted by x ascending: ${lines[0].lineText}`);
    }
  });

  // -------------------------------------------------------------
  // Category 4: Summary Formulas
  // -------------------------------------------------------------
  runTest('Summary Formulas', 'Liability A, Settlement B, Waiver C arithmetic', () => {
    const { outstandingReport } = getOceanAgroSampleData();
    const surplusDeficit = 270156.95;
    const res = calculateSummary(outstandingReport, surplusDeficit);

    // Total Liability A = 691,924.81
    if (res.liability.totalLiabilityA !== 691924.81) {
      throw new Error(`Expected Liability A 691924.81, got ${res.liability.totalLiabilityA}`);
    }
    // Settlement B = 301,899.72 + 1,700.00 + 270,156.95 = 573,756.67
    if (res.settlement.totalSettlementB !== 573756.67) {
      throw new Error(`Expected Settlement B 573756.67, got ${res.settlement.totalSettlementB}`);
    }
    // Waiver C = A - B = 118,168.14
    if (res.waiver.totalWaiverC !== 118168.14) {
      throw new Error(`Expected Waiver C 118168.14, got ${res.waiver.totalWaiverC}`);
    }
  });

  runTest('Summary Formulas', 'FSV coverage ratio percentage calculation', () => {
    const fsv = 345962.40;
    const liabilityA = 691924.81;
    const pct = calculateFsvCoveragePercent(fsv, liabilityA);
    // 345962.40 / 691924.81 * 100 = 50.00%
    if (Math.abs(pct - 50.0) > 0.05) {
      throw new Error(`Expected ~50.00% FSV coverage, got ${pct}`);
    }
  });

  // -------------------------------------------------------------
  // Category 5: End-to-End Acceptance Test (Ocean Agro Farm)
  // -------------------------------------------------------------
  runTest('Acceptance Test', 'Ocean Agro Farm full 37 segment COF & 7 validations', () => {
    const { ledgers, outstandingReport, partyPerformance } = getOceanAgroSampleData();
    const cofRes = calculateAllCof(ledgers, partyPerformance, DEFAULT_RATE_TABLE, '05/11/2026');
    const sumRes = calculateSummary(outstandingReport, cofRes.surplusDeficit);
    const validations = runAuditValidations(
      ledgers,
      outstandingReport,
      partyPerformance,
      DEFAULT_RATE_TABLE,
      cofRes.missingYears
    );

    // 1. 37 segments
    if (cofRes.allSegments.length !== 37) {
      throw new Error(`Expected 37 segments, got ${cofRes.allSegments.length}`);
    }
    // 2. Segments per account: 12 / 10 / 8 / 7
    const segCounts = cofRes.accountSummaries.map((s) => s.segments.length);
    if (JSON.stringify(segCounts) !== JSON.stringify([12, 10, 8, 7])) {
      throw new Error(`Expected [12, 10, 8, 7] segments, got ${JSON.stringify(segCounts)}`);
    }
    // 3. Total COF ~ 504,290.67
    if (Math.abs(cofRes.totalCof - 504290.67) > 1.0) {
      throw new Error(`Expected Total COF ~504290.67, got ${cofRes.totalCof}`);
    }
    // 4. Realized = 234,133.72
    if (Math.abs(cofRes.totalAlreadyRealized - 234133.72) > 0.05) {
      throw new Error(`Expected Realized 234133.72, got ${cofRes.totalAlreadyRealized}`);
    }
    // 5. All 7 validations pass
    const failingVals = validations.filter((v) => !v.passed);
    if (failingVals.length > 0) {
      throw new Error(`Validations failed: ${failingVals.map((v) => v.title).join('; ')}`);
    }
  });

  // -------------------------------------------------------------
  // Category 6: 2014 & 2015 Manual Rate Reference Schedule
  // -------------------------------------------------------------
  runTest('Pre-2016 Rates', '2014 & 2015 user-entered rates are correctly integrated into calculation', () => {
    const ledger2014: LedgerReport = {
      accountNo: '9999999999999',
      accountName: 'Test 2014 Account',
      accountType: 'MPI',
      openingDate: '01/06/2014',
      expiryDate: '01/06/2016',
      lastTxDate: '31/12/2015',
      fileName: 'test2014.pdf',
      fileHash: 'h2014',
      transactions: [
        {
          date: '01/06/2014',
          dateUtcDay: parseDateToUtcDay('01/06/2014'),
          debitPrincipal: 100000,
          debitGestation: 0,
          debitProfit: 0,
          debitCompensation: 0,
          debitCharge: 0,
          creditPrincipal: 0,
          creditGestation: 0,
          creditProfit: 0,
          creditCompensation: 0,
          creditCharge: 0,
          balancePrincipal: 100000,
          balanceGestation: 0,
          balanceProfit: 0,
          balanceCompensation: 0,
          balanceCharge: 0,
        },
      ],
      totalDebitPrincipal: 100000,
      totalDebitGestation: 0,
      totalDebitProfit: 0,
      totalDebitCompensation: 0,
      totalDebitCharge: 0,
      totalCreditPrincipal: 0,
      totalCreditGestation: 0,
      totalCreditProfit: 0,
      totalCreditCompensation: 0,
      totalCreditCharge: 0,
      finalPrincipalBalance: 100000,
    };

    // First check: without 2014 and 2015 in rates, missingYears flags 2014 and 2015
    const resWithout = calculateAllCof([ledger2014], null, DEFAULT_RATE_TABLE, '31/12/2015');
    if (!resWithout.missingYears.includes(2014) || !resWithout.missingYears.includes(2015)) {
      throw new Error(`Expected missing years to flag 2014 and 2015`);
    }

    // Now supply 2014 rate @ 11.20% and 2015 rate @ 10.80%
    const customRates = [
      { year: 2014, rate: 11.20 },
      { year: 2015, rate: 10.80 },
      ...DEFAULT_RATE_TABLE,
    ];

    const resWith = calculateAllCof([ledger2014], null, customRates, '31/12/2015');
    if (resWith.missingYears.length > 0) {
      throw new Error(`Missing years should be empty after supplying 2014/2015 rates`);
    }

    // Check segments:
    // Seg 1 (2014): 01/06/2014 to 31/12/2014 (214 days) @ 11.20%
    // Seg 2 (2015): 01/01/2015 to 31/12/2015 (365 days) @ 10.80%
    if (resWith.allSegments.length !== 2) {
      throw new Error(`Expected 2 segments, got ${resWith.allSegments.length}`);
    }
    const seg2014 = resWith.allSegments[0];
    const seg2015 = resWith.allSegments[1];
    if (seg2014.rate !== 11.20 || seg2014.year !== 2014) {
      throw new Error(`2014 segment rate mismatch: ${seg2014.rate}`);
    }
    if (seg2015.rate !== 10.80 || seg2015.year !== 2015) {
      throw new Error(`2015 segment rate mismatch: ${seg2015.rate}`);
    }
  });

  // -------------------------------------------------------------
  // Category 7: Customer Outstanding Princ Out Mapping
  // -------------------------------------------------------------
  runTest('Outstanding Mapping', 'Summary Principal is exclusively populated from Princ Out, never Disburse', () => {
    const { outstandingReport } = getOceanAgroSampleData();
    // In Ocean Agro Farm:
    // Disburse = 1,105,217.23
    // Princ Out = 301,899.72
    const sumRes = calculateSummary(outstandingReport, 0);

    if (sumRes.liability.principal !== 301899.72) {
      throw new Error(`Summary Principal must equal Princ Out (301,899.72), got ${sumRes.liability.principal}`);
    }
    if (sumRes.liability.principal === outstandingReport.grandTotal.disburse) {
      throw new Error(`Summary Principal was erroneously populated from Disburse!`);
    }
  });

  return results;
}
