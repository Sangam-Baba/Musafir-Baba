// @ts-check
/**
 * GST invoice numbers (plan Stage 08 §3.8, `04-…` §9 invariant 6): one gap-free series per MusafirBaba registration
 * (state code) and financial year (April–March, Indian time), e.g. `MB/26-27/000123` — at most 16 characters
 * (GST rule). Pure.
 */
import { DomainError } from '../../../core/errors.js';

export const INVOICE_PREFIX = 'MB';
export const MAX_INVOICE_LENGTH = 16;

/**
 * The financial year of a moment, in Indian time: 1 Apr 2026 – 31 Mar 2027 → '26-27'.
 * @param {Date} at
 */
export function financialYear(at) {
  const ist = new Date(at.getTime() + 330 * 60_000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${String(start % 100).padStart(2, '0')}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** @param {string} stateCode @param {string} fy */
export const seriesKey = (stateCode, fy) => `TAX_INVOICE:${stateCode}:${fy}`;

/**
 * @param {string} fy
 * @param {number} n 1, 2, …
 */
export function invoiceNumber(fy, n) {
  const text = `${INVOICE_PREFIX}/${fy}/${String(n).padStart(6, '0')}`;
  if (!Number.isSafeInteger(n) || n < 1 || text.length > MAX_INVOICE_LENGTH) throw new DomainError('INVOICE_NUMBER_INVALID', { n });
  return text;
}
