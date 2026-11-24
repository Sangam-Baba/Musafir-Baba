// @ts-check
/**
 * Webhook signatures (`06-api-and-events.md` §6): `MB-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret,
 * t + "." + rawBody)>`. While a rotated secret is still valid (24 h) the header carries one `v1` per secret, so the
 * receiver's old and new secret both work. Receivers reject signatures older than 5 minutes.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SIGNATURE_HEADER = 'MB-Signature';
export const TOLERANCE_SECONDS = 300;

/** @param {string} secret @param {number} t @param {string} body */
const mac = (secret, t, body) => createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');

/** @param {string[]} secrets current first @param {number} t unix seconds @param {string} body */
export const signatureHeader = (secrets, t, body) => [`t=${t}`, ...secrets.map((s) => `v1=${mac(s, t, body)}`)].join(',');

/**
 * What a receiver does (also shown in the docs): parse, check the age, compare each v1 in constant time.
 * @param {string} header @param {string} body @param {string} secret @param {number} nowSeconds
 */
export function verifySignature(header, body, secret, nowSeconds) {
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = Number(parts.find(([k]) => k === 't')?.[1]);
  if (!Number.isSafeInteger(t) || Math.abs(nowSeconds - t) > TOLERANCE_SECONDS) return false;
  const want = Buffer.from(mac(secret, t, body), 'hex');
  return parts
    .filter(([k, v]) => k === 'v1' && typeof v === 'string' && /^[a-f0-9]{64}$/.test(v))
    .some(([, v]) => timingSafeEqual(Buffer.from(/** @type {string} */ (v), 'hex'), want));
}
