// @ts-check
/**
 * Chart of accounts (plan Stage 07 §3.1, `04-domain-model.md` §5, §8.5) — CA to approve (Q7). Pure data.
 * Each account has a normal side: assets and expenses grow with debits (DEBIT), liabilities and revenue with credits
 * (CREDIT). A balance is shown on its normal side (positive = what the account normally holds).
 */

/** @typedef {'PLATFORM' | 'HOTEL' | 'CLIENT'} OwnerType */
/** @typedef {'DEBIT' | 'CREDIT'} NormalSide */

export const PLATFORM_ORG = 'platform';

/** @type {Readonly<Record<string, { owner: OwnerType, normal: NormalSide, name: string, mode: 'DERIVED' | 'LIVE' }>>} */
export const ACCOUNT_TYPES = Object.freeze({
  // MusafirBaba
  GATEWAY_CLEARING: { owner: 'PLATFORM', normal: 'DEBIT', name: 'PayU clearing (paid, not yet settled to the bank)', mode: 'DERIVED' },
  BANK: { owner: 'PLATFORM', normal: 'DEBIT', name: 'Bank', mode: 'DERIVED' },
  GATEWAY_FEES: { owner: 'PLATFORM', normal: 'DEBIT', name: 'PayU fees', mode: 'DERIVED' },
  REFUNDS_CLEARING: { owner: 'PLATFORM', normal: 'DEBIT', name: 'Refunds in progress', mode: 'DERIVED' },
  SUSPENSE: { owner: 'PLATFORM', normal: 'DEBIT', name: 'Suspense (to be explained)', mode: 'DERIVED' },
  CUSTOMER_ADVANCES: { owner: 'PLATFORM', normal: 'CREDIT', name: 'Customer advances (paid, booking not yet confirmed)', mode: 'DERIVED' },
  REVENUE_MARGIN: { owner: 'PLATFORM', normal: 'CREDIT', name: 'Revenue — booking margin', mode: 'DERIVED' },
  REVENUE_SAAS: { owner: 'PLATFORM', normal: 'CREDIT', name: 'Revenue — plans and usage', mode: 'DERIVED' },
  TAX_PAYABLE_CGST: { owner: 'PLATFORM', normal: 'CREDIT', name: 'CGST payable', mode: 'DERIVED' },
  TAX_PAYABLE_SGST: { owner: 'PLATFORM', normal: 'CREDIT', name: 'SGST payable', mode: 'DERIVED' },
  TAX_PAYABLE_IGST: { owner: 'PLATFORM', normal: 'CREDIT', name: 'IGST payable', mode: 'DERIVED' },
  DEDUCTIONS_PAYABLE: { owner: 'PLATFORM', normal: 'CREDIT', name: 'TDS / deductions from hotel payouts (payable)', mode: 'DERIVED' }, // Stage 15
  // each hotel company
  PAYABLE: { owner: 'HOTEL', normal: 'CREDIT', name: 'Payable to the hotel', mode: 'DERIVED' },
  // each B2B client (opened with Stage 11)
  WALLET: { owner: 'CLIENT', normal: 'CREDIT', name: 'Client wallet', mode: 'LIVE' },
  RECEIVABLE: { owner: 'CLIENT', normal: 'DEBIT', name: 'Client credit used (receivable)', mode: 'LIVE' },
});
/** @typedef {keyof typeof ACCOUNT_TYPES} AccountType */

/** The MusafirBaba accounts opened at start. */
export const PLATFORM_ACCOUNT_TYPES = Object.freeze(Object.keys(ACCOUNT_TYPES).filter((t) => ACCOUNT_TYPES[t]?.owner === 'PLATFORM'));

/**
 * A balance on the account's normal side.
 * @param {NormalSide} normal
 * @param {number} debitPaise total debits
 * @param {number} creditPaise total credits
 */
export const balanceOf = (normal, debitPaise, creditPaise) => (normal === 'DEBIT' ? debitPaise - creditPaise : creditPaise - debitPaise);
