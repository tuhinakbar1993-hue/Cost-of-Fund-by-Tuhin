/**
 * Sample dataset for SAIMA AGRO FARM (from authentic Party Performance PDF Party_Peformance_43d9cbe7.pdf).
 * Customer Total Recovery:
 * - Recovery Principal: 123,921.22
 * - Recovery Profit: 44,949.78
 * - Recovery Compensation: 0.00
 * Formula: Total already realized = 44,949.78 + 0.00 = 44,949.78
 */

import {
  LedgerReport,
  OutstandingReport,
  PartyPerformanceReport,
} from '../types';
import { parseDateToUtcDay } from '../utils/dateUtils';

export function getSaimaAgroSampleData(): {
  ledgers: LedgerReport[];
  outstandingReport: OutstandingReport;
  partyPerformance: PartyPerformanceReport;
} {
  const partyPerformance: PartyPerformanceReport = {
    branchName: 'EIDGAON BRANCH',
    customerName: 'SAIMA AGRO FARM',
    product: 'BAI-MURABAHA (TR) AGRICULTURE INST.',
    sanctionAmount: 300000.00,
    printDate: '11/11/2026',
    fileName: 'Party_Peformance_43d9cbe7.pdf',
    fileHash: 'saima_agro_farm_hash',
    rows: [
      {
        accountNo: '0549530000244',
        disbursementDate: '03/01/23',
        expiryDate: '03/01/26',
        disbursementAmt: 300000.00,
        receivable: {
          principal: 300000.00,
          profit: 59490.80,
          others: 300.00,
          compensation: 0.00,
          total: 359790.80,
        },
        recovery: {
          principal: 123921.22,
          profit: 44949.78,
          others: 150.00,
          compensation: 0.00,
          total: 169021.00,
        },
        outstanding: {
          principal: 176078.78,
          profit: 14541.02,
          others: 150.00,
          compensation: 0.00,
          total: 190769.80,
        },
        income: 49850.05,
        rebateAllowed: 0.00,
      },
    ],
    customerTotal: {
      disbursementAmt: 300000.00,
      receivable: {
        principal: 300000.00,
        profit: 59490.80,
        others: 300.00,
        compensation: 0.00,
        total: 359790.80,
      },
      recovery: {
        principal: 123921.22,
        profit: 44949.78, // Customer Total Recovery Profit
        others: 150.00,
        compensation: 0.00, // Customer Total Recovery Compensation
        total: 169021.00,
      },
      outstanding: {
        principal: 176078.78,
        profit: 14541.02,
        others: 150.00,
        compensation: 0.00,
        total: 190769.80,
      },
    },
  };

  const ledgers: LedgerReport[] = [
    {
      accountNo: '0549530000244',
      accountName: 'SAIMA AGRO FARM',
      accountType: 'BAI-MURABAHA (TR) AGRICULTURE INST.',
      openingDate: '03/01/2023',
      expiryDate: '03/01/2026',
      lastTxDate: '11/11/2026',
      fileName: '0549530000244_Ledger.pdf',
      fileHash: 'ledger_saima_0549530000244',
      transactions: [
        {
          date: '03/01/2023',
          dateUtcDay: parseDateToUtcDay('03/01/2023'),
          debitPrincipal: 300000.00,
          debitGestation: 0,
          debitProfit: 0,
          debitCompensation: 0,
          debitCharge: 0,
          creditPrincipal: 0,
          creditGestation: 0,
          creditProfit: 0,
          creditCompensation: 0,
          creditCharge: 0,
          balancePrincipal: 300000.00,
          balanceGestation: 0,
          balanceProfit: 0,
          balanceCompensation: 0,
          balanceCharge: 0,
          total: 300000.00,
        },
        {
          date: '15/07/2024',
          dateUtcDay: parseDateToUtcDay('15/07/2024'),
          debitPrincipal: 0,
          debitGestation: 0,
          debitProfit: 0,
          debitCompensation: 0,
          debitCharge: 0,
          creditPrincipal: 123921.22,
          creditGestation: 0,
          creditProfit: 44949.78,
          creditCompensation: 0.00,
          creditCharge: 0,
          balancePrincipal: 176078.78,
          balanceGestation: 0,
          balanceProfit: 0,
          balanceCompensation: 0,
          balanceCharge: 0,
          total: 176078.78,
        },
      ],
      totalDebitPrincipal: 300000.00,
      totalDebitGestation: 0,
      totalDebitProfit: 0,
      totalDebitCompensation: 0,
      totalDebitCharge: 0,
      totalCreditPrincipal: 123921.22,
      totalCreditGestation: 0,
      totalCreditProfit: 44949.78,
      totalCreditCompensation: 0.00,
      totalCreditCharge: 0,
      finalPrincipalBalance: 176078.78,
    },
  ];

  const outstandingReport: OutstandingReport = {
    cisId: '0549530000244',
    customerName: 'SAIMA AGRO FARM',
    printDate: '11/11/2026',
    fileName: 'Saima_Outstanding.pdf',
    fileHash: 'saima_outstanding_hash',
    rows: [
      {
        sl: 1,
        accountNo: '0549530000244',
        status: 'BL',
        type: 'BAI-MURABAHA',
        openDate: '03/01/2023',
        expireDate: '03/01/2026',
        disburse: 300000.00,
        rate: 9.0,
        princOut: 176078.78,
        profitOut: 14541.02,
        compensation: 0.00,
        unappliedPro: 0.00,
        charge: 150.00,
        rebate: 0.00,
        netOut: 190769.80,
      },
    ],
    grandTotal: {
      disburse: 300000.00,
      princOut: 176078.78,
      profitOut: 14541.02,
      compensation: 0.00,
      unappliedPro: 0.00,
      charge: 150.00,
      rebate: 0.00,
      netOut: 190769.80,
    },
  };

  return { ledgers, outstandingReport, partyPerformance };
}
