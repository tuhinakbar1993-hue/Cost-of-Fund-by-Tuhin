/**
 * Cost of Fund (COF) Calculation Engine.
 * Pure, deterministic, memoizable, runs in < 50ms.
 */

import {
  AccountCofSummary,
  CofCalculationResult,
  CofSegment,
  LedgerReport,
  PartyPerformanceReport,
  RateYear,
} from '../types';
import {
  formatUtcDay,
  parseDateToUtcDay,
  splitIntervalByCalendarYears,
} from '../utils/dateUtils';
import { round2 } from '../utils/numberUtils';

export const DEFAULT_RATE_TABLE: RateYear[] = [
  { year: 2016, rate: 9.53 },
  { year: 2017, rate: 9.35 },
  { year: 2018, rate: 10.31 },
  { year: 2019, rate: 10.77 },
  { year: 2020, rate: 10.55 },
  { year: 2021, rate: 8.90 },
  { year: 2022, rate: 8.48 },
  { year: 2023, rate: 9.23 },
  { year: 2024, rate: 10.85 },
  { year: 2025, rate: 15.88, provisional: true },
  { year: 2026, rate: 10.08, provisional: true, label: 'latest available month, July 2026' },
];

export interface PrincipalStep {
  dateStr: string;
  utcDay: number;
  principalBalance: number;
}

/**
 * Extracts the timeline of principal balance changes for an account.
 * Starts from first row with Debit Principal > 0 (disbursement).
 * If multiple rows share a date, uses the last balance on that date.
 */
export function extractPrincipalTimeline(ledger: LedgerReport): PrincipalStep[] {
  const txs = [...ledger.transactions].sort((a, b) => a.dateUtcDay - b.dateUtcDay);

  let firstDisbursedIndex = -1;
  for (let i = 0; i < txs.length; i++) {
    if (txs[i].debitPrincipal > 0) {
      firstDisbursedIndex = i;
      break;
    }
  }

  if (firstDisbursedIndex === -1) {
    return [];
  }

  // Filter to transactions where principal actually changes
  // A principal change happens if debitPrincipal > 0 or creditPrincipal > 0
  const relevantTxs = txs.slice(firstDisbursedIndex).filter(
    (tx) => tx.debitPrincipal > 0 || tx.creditPrincipal > 0
  );

  // Group by date, keeping the last transaction on each date
  const stepsByDate = new Map<number, PrincipalStep>();

  for (const tx of relevantTxs) {
    stepsByDate.set(tx.dateUtcDay, {
      dateStr: tx.date,
      utcDay: tx.dateUtcDay,
      principalBalance: tx.balancePrincipal,
    });
  }

  return Array.from(stepsByDate.values()).sort((a, b) => a.utcDay - b.utcDay);
}

/**
 * Builds note text describing provisional rates.
 */
export function buildNoteText(rates: RateYear[]): string {
  const provisional = rates.filter((r) => r.provisional);
  if (provisional.length === 0) {
    return 'Note: Standard Cost of Fund rates have been considered for this calculation.';
  }

  const parts = provisional.map((r) => {
    if (r.label) {
      return `Last available month i.e ${r.label.replace(/^latest available month,?\s*/i, '')}@ ${r.rate.toFixed(2)}`;
    }
    return `year of ${r.year}@ ${r.rate.toFixed(2)}`;
  });

  return `Note: Provisional Cost of Fund for the ${parts.join(' & ')} has been considered for this calculation.`;
}

/**
 * Calculates COF for a single account up to the specified cut-off date.
 */
export function calculateAccountCof(
  ledger: LedgerReport,
  accountIndex: number,
  calculationUpToDay: number,
  rateMap: Map<number, number>,
  globalSegmentCounter: { value: number }
): { summary: AccountCofSummary; missingYears: Set<number> } {
  const steps = extractPrincipalTimeline(ledger);
  const segments: CofSegment[] = [];
  const missingYears = new Set<number>();

  if (steps.length === 0) {
    return {
      summary: {
        accountNo: ledger.accountNo,
        segments: [],
        subtotalCof: 0,
        firstDisbursementDate: ledger.openingDate || '-',
        lastAdjustmentDate: ledger.lastTxDate || '-',
      },
      missingYears,
    };
  }

  const firstDisbursementDate = steps[0].dateStr;
  let lastAdjustmentDate = steps[steps.length - 1].dateStr;

  for (let i = 0; i < steps.length; i++) {
    const currentStep = steps[i];
    const principal = currentStep.principalBalance;

    // If principal reached 0, balance stops here
    if (principal <= 0) {
      break;
    }

    // Determine interval end date:
    // Either the day BEFORE the next principal step, or the calculationUpToDay
    let intervalEndDay: number;
    if (i + 1 < steps.length) {
      intervalEndDay = steps[i + 1].utcDay - 1;
    } else {
      intervalEndDay = calculationUpToDay;
    }

    // If intervalEndDay is before currentStep.utcDay, skip (can happen if next step is same day or next day)
    if (intervalEndDay < currentStep.utcDay) {
      continue;
    }

    // Split interval by calendar year boundaries
    const yearSegments = splitIntervalByCalendarYears(currentStep.utcDay, intervalEndDay);

    for (const ys of yearSegments) {
      const rate = rateMap.get(ys.year);
      if (rate === undefined) {
        missingYears.add(ys.year);
      }
      const activeRate = rate ?? 0;

      // Effective Days = End - Start + 1
      const effectiveDays = ys.effectiveDays;
      // Time Period (In Year) = effectiveDays / 365 (always 365, even in leap years!)
      const timePeriodYears = effectiveDays / 365;
      // Cost of Fund = Principal * Rate * Years / 100 (full precision)
      const cofAmount = (principal * activeRate * timePeriodYears) / 100;

      globalSegmentCounter.value += 1;

      segments.push({
        accountNo: ledger.accountNo,
        accountIndex,
        segmentIndex: segments.length + 1,
        globalIndex: globalSegmentCounter.value,
        startDate: ys.startDateStr,
        endDate: ys.endDateStr,
        startUtcDay: ys.startUtcDay,
        endUtcDay: ys.endUtcDay,
        effectiveDays,
        principal,
        rate: activeRate,
        timePeriodYears,
        cofAmount,
        year: ys.year,
      });
    }
  }

  const subtotalCof = segments.reduce((acc, s) => acc + s.cofAmount, 0);

  return {
    summary: {
      accountNo: ledger.accountNo,
      segments,
      subtotalCof,
      firstDisbursementDate,
      lastAdjustmentDate,
    },
    missingYears,
  };
}

/**
 * Main COF calculation function over all accounts.
 */
export function calculateAllCof(
  ledgers: LedgerReport[],
  partyPerformance: PartyPerformanceReport | null,
  rateTable: RateYear[],
  calculationUpToDateStr: string
): CofCalculationResult {
  const calculationUpToDay = parseDateToUtcDay(calculationUpToDateStr);

  // Sort ledgers ascending by account number as required
  const sortedLedgers = [...ledgers].sort((a, b) => a.accountNo.localeCompare(b.accountNo));

  const rateMap = new Map<number, number>();
  for (const r of rateTable) {
    rateMap.set(r.year, r.rate);
  }

  const globalSegmentCounter = { value: 0 };
  const allMissingYears = new Set<number>();
  const accountSummaries: AccountCofSummary[] = [];
  const allSegments: CofSegment[] = [];

  sortedLedgers.forEach((ledger, idx) => {
    const { summary, missingYears } = calculateAccountCof(
      ledger,
      idx + 1,
      calculationUpToDay,
      rateMap,
      globalSegmentCounter
    );
    accountSummaries.push(summary);
    allSegments.push(...summary.segments);
    missingYears.forEach((y) => allMissingYears.add(y));
  });

  const totalCof = allSegments.reduce((sum, s) => sum + s.cofAmount, 0);

  // Recovery amounts from Party Performance Customer Total row (Recovery group)
  // Total already realized = Profit recovery + Compensation recovery
  let profitRecovery = 0;
  let compensationRecovery = 0;

  if (partyPerformance?.customerTotal?.recovery) {
    profitRecovery = partyPerformance.customerTotal.recovery.profit;
    compensationRecovery = partyPerformance.customerTotal.recovery.compensation;
  } else if (partyPerformance?.rows && partyPerformance.rows.length > 0) {
    profitRecovery = partyPerformance.rows.reduce((sum, r) => sum + r.recovery.profit, 0);
    compensationRecovery = partyPerformance.rows.reduce(
      (sum, r) => sum + r.recovery.compensation,
      0
    );
  } else {
    // Fall back to ledger credit totals (credit profit + credit compensation)
    profitRecovery = ledgers.reduce((sum, l) => sum + l.totalCreditProfit, 0);
    compensationRecovery = ledgers.reduce((sum, l) => sum + l.totalCreditCompensation, 0);
  }

  const totalAlreadyRealized = profitRecovery + compensationRecovery;
  // Surplus / Deficit of realization over COF = Total COF - Total realized
  const surplusDeficit = totalCof - totalAlreadyRealized;

  const noteText = buildNoteText(rateTable);

  return {
    accountSummaries,
    allSegments,
    totalCof,
    totalAlreadyRealized,
    profitRecovery,
    compensationRecovery,
    surplusDeficit,
    calculationUpToDate: calculationUpToDateStr,
    missingYears: Array.from(allMissingYears).sort((a, b) => a - b),
    noteText,
  };
}
