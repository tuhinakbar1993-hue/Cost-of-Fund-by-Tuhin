/**
 * Settlement Summary Calculation Engine.
 * Implements CBS liability position, settlement covering COF, and proposed waiver.
 */

import {
  OutstandingReport,
  SummaryCalculationResult,
} from '../types';
import { round2 } from '../utils/numberUtils';

export function calculateSummary(
  outstandingReport: OutstandingReport | null,
  surplusDeficitCof: number
): SummaryCalculationResult {
  let principal = 0;
  let chargedProfit = 0;
  const gestationRent = 0;
  let charges = 0;
  let compensation = 0;
  let unchargedCompensation = 0;
  const unchargedProfit = 0;

  if (outstandingReport) {
    if (outstandingReport.grandTotal) {
      principal = outstandingReport.grandTotal.princOut;
      chargedProfit = outstandingReport.grandTotal.profitOut;
      compensation = outstandingReport.grandTotal.compensation;
      unchargedCompensation = outstandingReport.grandTotal.unappliedPro;
      charges = outstandingReport.grandTotal.charge;
    } else if (outstandingReport.rows && outstandingReport.rows.length > 0) {
      for (const row of outstandingReport.rows) {
        principal += row.princOut;
        chargedProfit += row.profitOut;
        compensation += row.compensation;
        unchargedCompensation += row.unappliedPro;
        charges += row.charge;
      }
    }
  }

  // Round individual components to 2 decimal places
  principal = round2(principal);
  chargedProfit = round2(chargedProfit);
  charges = round2(charges);
  compensation = round2(compensation);
  unchargedCompensation = round2(unchargedCompensation);

  // Total Liability (A) = SUM of the 7 components
  const totalLiabilityA = round2(
    principal +
      chargedProfit +
      gestationRent +
      charges +
      compensation +
      unchargedCompensation +
      unchargedProfit
  );

  // B) Settlement Amount Covering Cost of Fund:
  // 1 Principal = A.1
  // 2 Charges = A.4
  // 3 Cost of Fund = Surplus/Deficit from Calculation 1 (round to 2 decimals)
  const cofRounded = round2(surplusDeficitCof);
  const totalSettlementB = round2(principal + charges + cofRounded);

  // C) Proposed Waiver Covering Cost of Fund (A - B):
  // Rows 1-8 show "-" in official template, only Total Liability = A - B is filled
  const totalWaiverC = round2(totalLiabilityA - totalSettlementB);

  return {
    liability: {
      principal,
      chargedProfit,
      gestationRent,
      charges,
      compensation,
      unchargedCompensation,
      unchargedProfit,
      totalLiabilityA,
    },
    settlement: {
      principal,
      charges,
      costOfFund: cofRounded,
      totalSettlementB,
    },
    waiver: {
      principal: 0,
      charges: 0,
      costOfFund: 0,
      totalWaiverC,
    },
  };
}

export function calculateFsvCoveragePercent(
  fsv: number | null | undefined,
  totalLiabilityA: number
): number {
  if (!totalLiabilityA || totalLiabilityA <= 0 || !fsv || fsv <= 0) {
    return 0;
  }
  return round2((fsv / totalLiabilityA) * 100);
}
