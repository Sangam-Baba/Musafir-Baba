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

/** Two-letter codes of the GST states (for credit note numbers, e.g. 07 → DL). */
export const STATE_LETTERS = Object.freeze(
  /** @type {Record<string, string>} */ ({
    '01': 'JK',
    '02': 'HP',
    '03': 'PB',
    '04': 'CH',
    '05': 'UK',
    '06': 'HR',
    '07': 'DL',
    '08': 'RJ',
    '09': 'UP',
    10: 'BR',
    11: 'SK',
    12: 'AR',
    13: 'NL',
    14: 'MN',
    15: 'MZ',
    16: 'TR',
    17: 'ML',
    18: 'AS',
    19: 'WB',
    20: 'JH',
    21: 'OD',
    22: 'CG',
    23: 'MP',
    24: 'GJ',
    26: 'DN',
    27: 'MH',
    29: 'KA',
    30: 'GA',
    31: 'LD',
    32: 'KL',
    33: 'TN',
    34: 'PY',
    35: 'AN',
    36: 'TS',
    37: 'AP',
    38: 'LA',
    97: 'OT',
  }),
);

/** @param {string} stateCode @param {string} fy */
export const creditSeriesKey = (stateCode, fy) => `CREDIT_NOTE:${stateCode}:${fy}`;

/**
 * Credit note numbers (plan Stage 09 §3.10): `C2627DL000045` — C, the financial year, the registration's state, a
 * gap-free number; at most 16 characters.
 * @param {string} fy '26-27'
 * @param {string} stateCode
 * @param {number} n
 */
export function creditNoteNumber(fy, stateCode, n) {
  const text = `C${fy.replace('-', '')}${STATE_LETTERS[stateCode] ?? stateCode}${String(n).padStart(6, '0')}`;
  if (!Number.isSafeInteger(n) || n < 1 || text.length > MAX_INVOICE_LENGTH) throw new DomainError('CREDIT_NOTE_NUMBER_INVALID', { n });
  return text;
}
