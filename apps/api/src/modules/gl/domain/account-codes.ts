/**
 * Phase-0 chart-of-accounts control codes. The guest ledger, cash, and tax-payable accounts are GL
 * control accounts so the trial balance ties to operational truth by construction (doc 07 §2).
 * Full USALI chart design lands with the Accounting module (doc modules/05).
 */
export const ACCOUNT = {
  CASH: '1000',
  GUEST_LEDGER: '1100', // control: Σ open folio balances
  CITY_LEDGER: '1200', // AR control
  DEPOSIT_LEDGER: '2000', // advance deposits (liability)
  TAX_PAYABLE: '2100',
  ROOM_REVENUE: '4000',
  FNB_REVENUE: '4100',
  MISC_REVENUE: '4200',
  CANCELLATION_REVENUE: '4900',
} as const;

export type AccountCode = (typeof ACCOUNT)[keyof typeof ACCOUNT];

/** Seed definition for a standard chart account. */
export interface ChartAccountSeed {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normalBalance: 'debit' | 'credit';
  isControl?: boolean;
}

export const STANDARD_CHART: ChartAccountSeed[] = [
  { code: ACCOUNT.CASH, name: 'Cash & Bank', type: 'asset', normalBalance: 'debit' },
  { code: ACCOUNT.GUEST_LEDGER, name: 'Guest Ledger', type: 'asset', normalBalance: 'debit', isControl: true },
  { code: ACCOUNT.CITY_LEDGER, name: 'City Ledger (AR)', type: 'asset', normalBalance: 'debit', isControl: true },
  { code: ACCOUNT.DEPOSIT_LEDGER, name: 'Advance Deposits', type: 'liability', normalBalance: 'credit', isControl: true },
  { code: ACCOUNT.TAX_PAYABLE, name: 'Tax Payable', type: 'liability', normalBalance: 'credit' },
  { code: ACCOUNT.ROOM_REVENUE, name: 'Room Revenue', type: 'revenue', normalBalance: 'credit' },
  { code: ACCOUNT.FNB_REVENUE, name: 'Food & Beverage Revenue', type: 'revenue', normalBalance: 'credit' },
  { code: ACCOUNT.MISC_REVENUE, name: 'Miscellaneous Revenue', type: 'revenue', normalBalance: 'credit' },
  { code: ACCOUNT.CANCELLATION_REVENUE, name: 'Cancellation & No-show Revenue', type: 'revenue', normalBalance: 'credit' },
];
