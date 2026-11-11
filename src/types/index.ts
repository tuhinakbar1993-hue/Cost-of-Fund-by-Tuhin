/**
 * Core type definitions for COF & Settlement Summary Generator
 */

export interface RateYear {
  year: number;
  rate: number;
  provisional?: boolean;
  label?: string; // e.g. "latest available month, July 2026"
}

export interface LedgerTransaction {
  date: string; // dd/mm/yyyy
  dateUtcDay: number;
  // DEBIT
  debitPrincipal: number;
  debitGestation: number;
  debitProfit: number;
  debitCompensation: number;
  debitCharge: number;
  // CREDIT
  creditPrincipal: number;
  creditGestation: number;
  creditProfit: number;
  creditCompensation: number;
  creditCharge: number;
  // BALANCE
  balancePrincipal: number;
  balanceGestation: number;
  balanceProfit: number;
  balanceCompensation: number;
  balanceCharge: number;
  total?: number;
}

export interface LedgerReport {
  accountNo: string; // 13 digits
  accountName: string;
  accountType: string;
  openingDate: string; // dd/mm/yyyy
  expiryDate: string; // dd/mm/yyyy
  lastTxDate: string; // dd/mm/yyyy
  transactions: LedgerTransaction[];
  // Totals from report
  totalDebitPrincipal: number;
  totalDebitGestation: number;
  totalDebitProfit: number;
  totalDebitCompensation: number;
  totalDebitCharge: number;
  totalCreditPrincipal: number;
  totalCreditGestation: number;
  totalCreditProfit: number;
  totalCreditCompensation: number;
  totalCreditCharge: number;
  finalPrincipalBalance: number;
  fileName: string;
  fileHash: string;
}

export interface OutstandingRow {
  sl: number;
  accountNo: string;
  status: string; // e.g. "BL"
  type: string;
  openDate: string;
  expireDate: string;
  disburse: number;
  rate: number;
  princOut: number;
  profitOut: number;
  compensation: number;
  unappliedPro: number;
  charge: number;
  rebate: number;
  netOut: number;
}

export interface OutstandingReport {
  cisId: string;
  customerName: string;
  printDate: string;
  rows: OutstandingRow[];
  grandTotal: {
    disburse: number;
    princOut: number;
    profitOut: number;
    compensation: number;
    unappliedPro: number;
    charge: number;
    rebate: number;
    netOut: number;
  };
  reconciliation?: {
    isReconciled: boolean;
    sumPrincOut: number;
    diffPrincOut: number;
    sumProfitOut: number;
    sumCompensation: number;
    sumUnappliedPro: number;
    sumCharge: number;
  };
  fileName: string;
  fileHash: string;
}

export interface PartyPerformanceRow {
  accountNo: string;
  disbursementDate: string;
  expiryDate: string;
  disbursementAmt: number;
  receivable: {
    principal: number;
    profit: number;
    others: number;
    compensation: number;
    total: number;
  };
  recovery: {
    principal: number;
    profit: number;
    others: number;
    compensation: number;
    total: number;
  };
  outstanding: {
    principal: number;
    profit: number;
    others: number;
    compensation: number;
    total: number;
  };
  income?: number;
  rebateAllowed?: number;
  adjustDate?: string;
}

export interface PartyPerformanceReport {
  branchName: string;
  customerName: string;
  product: string;
  sanctionAmount: number;
  printDate: string;
  rows: PartyPerformanceRow[];
  customerTotal: {
    disbursementAmt: number;
    receivable: {
      principal: number;
      profit: number;
      others: number;
      compensation: number;
      total: number;
    };
    recovery: {
      principal: number;
      profit: number;
      others: number;
      compensation: number;
      total: number;
    };
    outstanding: {
      principal: number;
      profit: number;
      others: number;
      compensation: number;
      total: number;
    };
  };
  fileName: string;
  fileHash: string;
}

export interface CofSegment {
  accountNo: string;
  accountIndex: number; // 1-based account index
  segmentIndex: number; // 1-based segment index within account
  globalIndex: number;
  startDate: string; // dd/mm/yyyy
  endDate: string; // dd/mm/yyyy
  startUtcDay: number;
  endUtcDay: number;
  effectiveDays: number;
  principal: number;
  rate: number;
  timePeriodYears: number; // effectiveDays / 365
  cofAmount: number; // principal * rate * timePeriodYears / 100
  year: number;
}

export interface AccountCofSummary {
  accountNo: string;
  segments: CofSegment[];
  subtotalCof: number;
  firstDisbursementDate: string;
  lastAdjustmentDate: string;
}

export interface CofCalculationResult {
  accountSummaries: AccountCofSummary[];
  allSegments: CofSegment[];
  totalCof: number;
  totalAlreadyRealized: number; // Profit recovery + Compensation recovery
  profitRecovery: number;
  compensationRecovery: number;
  surplusDeficit: number; // Total COF - Total realized
  calculationUpToDate: string;
  missingYears: number[];
  noteText: string;
}

export interface SummaryCalculationResult {
  // A) Liability Position
  liability: {
    principal: number;
    chargedProfit: number;
    gestationRent: number; // 0
    charges: number;
    compensation: number;
    unchargedCompensation: number; // unapplied pro
    unchargedProfit: number; // 0
    totalLiabilityA: number;
  };
  // B) Settlement Amount
  settlement: {
    principal: number;
    charges: number;
    costOfFund: number;
    totalSettlementB: number;
  };
  // C) Proposed Waiver
  waiver: {
    principal: number; // 0
    charges: number; // 0
    costOfFund: number; // 0
    totalWaiverC: number; // totalLiabilityA - totalSettlementB
  };
}

export interface ManualInputs {
  managingDirectorName: string;
  valuationFirm: string;
  valuationDate: string;
  marketValue: number | null;
  forcedSaleValue: number | null;
  liabilityCoveredByFsvPercentManual: string; // user-entered value (e.g. "80.50" or "")
  useSuggestedFsvPercent: boolean; // true if user clicked "Use Suggested"
  legalNiAct: string;
  legalArthari: string;
  legalOther: string;
  specialRemarks: string;
  rate2014: string; // 2014 — Rate of Cost of Fund (% p.a.) manually entered by user
  rate2015: string; // 2015 — Rate of Cost of Fund (% p.a.) manually entered by user
  bankLogo?: string | null; // Base64 data URL for bank logo
  bismillahImage?: string | null; // Base64 data URL for Bismillah header
  bankLine1: string;
  bankLine2: string;
  bankLine3: string;
  bankLine4: string;
  logoLeft?: string; // data URL or URL
  logoRight?: string; // data URL or URL
  branchName: string;
  clientName: string;
  clStatus: string;
  calculationUpToDate: string;
  showWaiverBreakdown: boolean;
}

export interface ValidationItem {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  isFatal?: boolean;
  details?: string[];
}

export type DetectedReportType =
  | 'INVESTMENT_LEDGER'
  | 'CUSTOMER_OUTSTANDING'
  | 'PARTY_PERFORMANCE'
  | 'UNKNOWN';

export interface UploadedFileStatus {
  id: string;
  name: string;
  size: number;
  type: DetectedReportType;
  accountNo?: string;
  error?: string;
  isDuplicate?: boolean;
  rawTextPreview?: string;
}
