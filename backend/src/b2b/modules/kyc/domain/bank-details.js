// @ts-check
/**
 * The bank account payouts go to (plan Stage 02 §3.3): holder name, account number, IFSC. Pure.
 * The account number is stored encrypted and shown as its last 4 digits only.
 */
import { DomainError } from '../../../core/errors.js';

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT = /^\d{9,18}$/;

/** @typedef {{ holderName: string, accountNumber: string, ifsc: string }} BankDetails */

/** @param {string} value @returns {string} the last 4 characters (never the rest) */
export const lastFour = (value) => value.slice(-4);

/**
 * @param {{ holderName?: unknown, accountNumber?: unknown, ifsc?: unknown }} input
 * @returns {BankDetails}
 */
export function validateBankDetails(input) {
  const holderName = String(input.holderName ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const accountNumber = String(input.accountNumber ?? '').replace(/[\s-]/g, '');
  const ifsc = String(input.ifsc ?? '')
    .trim()
    .toUpperCase();
  /** @type {{ path: string, code: string }[]} */
  const errors = [];
  if (holderName.length < 2 || holderName.length > 120) errors.push({ path: 'holderName', code: 'HOLDER_NAME_INVALID' });
  if (!ACCOUNT.test(accountNumber)) errors.push({ path: 'accountNumber', code: 'ACCOUNT_NUMBER_INVALID' });
  if (!IFSC.test(ifsc)) errors.push({ path: 'ifsc', code: 'IFSC_INVALID' });
  if (errors.length > 0) throw new DomainError('BANK_DETAILS_INVALID', { errors });
  return { holderName, accountNumber, ifsc };
}
