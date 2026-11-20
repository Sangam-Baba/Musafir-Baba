// @ts-check
/**
 * PayU formulas (pure) — the same request / response hashes the existing website integration uses, plus PayU's
 * server API hash. Amounts go to PayU as rupees with two decimals ("997.50") and come back the same way.
 *   request:  sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 *   response: sha512([additionalCharges|]SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 *   API:      sha512(key|command|var1|SALT)
 */
import { createHash, timingSafeEqual } from 'node:crypto';

/** @param {string} s */
const sha512 = (s) => createHash('sha512').update(s).digest('hex');

/** 99750 → "997.50" @param {number} paise */
export function toRupees(paise) {
  if (!Number.isSafeInteger(paise) || paise <= 0) throw new Error('[b2b] PayU amount must be positive whole paise');
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;
}

/** "997.50" / "997.5" / "997" → 99750; anything else → NaN. @param {unknown} rupees */
export function toPaise(rupees) {
  const s = String(rupees ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return Number.NaN;
  const [whole, frac = ''] = s.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/**
 * @typedef {{ txnid: string, amount: string, productinfo: string, firstname: string, email: string,
 *   udf1?: string, udf2?: string, udf3?: string, udf4?: string, udf5?: string }} PayuRequest
 */

/** @param {PayuRequest} r @param {{ key: string, salt: string }} m */
export function requestHash(r, m) {
  const u = [r.udf1, r.udf2, r.udf3, r.udf4, r.udf5].map((x) => x ?? '');
  return sha512([m.key, r.txnid, r.amount, r.productinfo, r.firstname, r.email, ...u, '', '', '', '', '', m.salt].join('|'));
}

/**
 * The hash PayU should have sent back for these response fields.
 * @param {Record<string, string | undefined>} p the posted response
 * @param {{ key: string, salt: string }} m
 */
export function expectedResponseHash(p, m) {
  const v = (/** @type {string} */ k) => p[k] ?? '';
  const parts = [
    m.salt,
    v('status'),
    '',
    '',
    '',
    '',
    '',
    v('udf5'),
    v('udf4'),
    v('udf3'),
    v('udf2'),
    v('udf1'),
    v('email'),
    v('firstname'),
    v('productinfo'),
    v('amount'),
    v('txnid'),
    m.key,
  ];
  return sha512((p.additionalCharges ? [p.additionalCharges, ...parts] : parts).join('|'));
}

/** Constant-time check of PayU's response hash. @param {Record<string, string | undefined>} p @param {{ key: string, salt: string }} m */
export function responseHashValid(p, m) {
  const given = Buffer.from(String(p.hash ?? '').toLowerCase(), 'utf8');
  const expected = Buffer.from(expectedResponseHash(p, m), 'utf8');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** @param {string} command @param {string} var1 @param {{ key: string, salt: string }} m */
export const apiHash = (command, var1, m) => sha512([m.key, command, var1, m.salt].join('|'));

/** PayU's own words for a payment → ours. @param {unknown} status */
export function statusOf(status) {
  const s = String(status ?? '').toLowerCase();
  if (s === 'success' || s === 'captured') return /** @type {const} */ ('SUCCESS');
  if (s === 'pending' || s === 'in progress' || s === 'initiated') return /** @type {const} */ ('PENDING');
  if (s === 'failure' || s === 'failed' || s === 'bounced' || s === 'dropped' || s === 'usercancelled' || s === 'cancelled')
    return /** @type {const} */ ('FAILURE');
  return /** @type {const} */ ('UNKNOWN');
}

/** Our transaction ids (nothing existing starts with B2B). @type {Readonly<Record<'ORDER' | 'TOPUP' | 'SUBSCRIPTION', string>>} */
export const TXN_PREFIX = Object.freeze({ ORDER: 'B2BH', TOPUP: 'B2BW', SUBSCRIPTION: 'B2BS' });
