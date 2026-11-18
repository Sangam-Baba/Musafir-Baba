// @ts-check
/**
 * Price tokens (plan Stage 05 §3.7). A quote hands the buyer a token; booking (Stage 08) sends it back and the
 * server re-prices — the browser's amount is never trusted.
 * - Format: `base64url(JSON payload) "." base64url(HMAC-SHA256(key, first part))`. The payload names its key
 *   (`kid`), so keys can be rotated: tokens signed with an older key verify until they expire.
 * - Keys are derived from the server secret and the key id (HKDF) — no key material is stored anywhere.
 * - The payload is readable by the buyer, so it holds only what they already see: no hotel rate, no margin. The
 *   breakdown is pinned by a **keyed** hash (HMAC), so it can't be guessed back from the token.
 * - Bound to the channel and the buyer (client org or website customer): another org's token is refused.
 */
import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto';

import { DomainError } from '../../../core/errors.js';

export const TOKEN_MINUTES = 15;
const TOKEN_VERSION = 1;
const MAX_TOKEN_LENGTH = 4096;

/**
 * @typedef {{ channel: string, clientOrgId?: string | null, customerId?: string | null }} Buyer
 * @typedef {{ propertyId: string, roomTypeId: string, ratePlanId: string, checkIn: string, checkOut: string,
 *   occupancies: { adults: number, children: number }[] }} Stay
 * @typedef {Buyer & Stay & { v: number, kid: string, totalPaise: number, breakdownHash: string, exp: number }} TokenPayload
 */

/** @param {string} secret @param {string} kid */
const keyFor = (secret, kid) => Buffer.from(hkdfSync('sha256', secret, 'musafirbaba-b2b', `price-token:${kid}`, 32));

/** Same object → same text, whatever the key order. @param {unknown} v @returns {string} */
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(/** @type {Record<string, unknown>} */ (v)[k])}`)
      .join(',')}}`;
  return JSON.stringify(v ?? null);
}

/**
 * Keyed fingerprint of a breakdown (never guessable from the token).
 * @param {unknown} breakdown
 * @param {{ secret: string, kid: string }} key
 */
export function breakdownHash(breakdown, key) {
  return createHmac('sha256', keyFor(key.secret, key.kid))
    .update(`breakdown:${canonical(breakdown)}`)
    .digest('base64url');
}

/**
 * @param {Buyer & Stay & { totalPaise: number, breakdown: unknown }} what
 * @param {{ secret: string, kid: string, now: Date }} key
 * @returns {{ token: string, expiresAt: Date }}
 */
export function signToken(what, key) {
  const { breakdown, ...rest } = what;
  const exp = Math.floor(key.now.getTime() / 1000) + TOKEN_MINUTES * 60;
  /** @type {TokenPayload} */
  const payload = { ...rest, v: TOKEN_VERSION, kid: key.kid, breakdownHash: breakdownHash(breakdown, key), exp };
  const body = Buffer.from(canonical(payload)).toString('base64url');
  const mac = createHmac('sha256', keyFor(key.secret, key.kid)).update(body).digest('base64url');
  return { token: `${body}.${mac}`, expiresAt: new Date(exp * 1000) };
}

/** @param {string} token */
function readBody(token) {
  const parts = typeof token === 'string' && token.length <= MAX_TOKEN_LENGTH ? token.split('.') : [];
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new DomainError('PRICE_TOKEN_INVALID');
  try {
    return {
      body: parts[0],
      mac: parts[1],
      payload: /** @type {TokenPayload} */ (JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))),
    };
  } catch {
    throw new DomainError('PRICE_TOKEN_INVALID');
  }
}

/**
 * Signature, key, expiry and binding checks. Throws PRICE_TOKEN_INVALID / PRICE_TOKEN_EXPIRED / PRICE_TOKEN_NOT_YOURS.
 * @param {string} token
 * @param {{ secret: string, usableKids: ReadonlySet<string>, now: Date, buyer: Buyer }} check
 * @returns {TokenPayload}
 */
export function verifyToken(token, check) {
  const { body, mac, payload } = readBody(token);
  if (payload?.v !== TOKEN_VERSION || typeof payload.kid !== 'string' || !check.usableKids.has(payload.kid))
    throw new DomainError('PRICE_TOKEN_INVALID');
  const expected = createHmac('sha256', keyFor(check.secret, payload.kid)).update(body).digest();
  const given = Buffer.from(mac, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new DomainError('PRICE_TOKEN_INVALID');
  if (!Number.isSafeInteger(payload.exp) || payload.exp * 1000 <= check.now.getTime()) throw new DomainError('PRICE_TOKEN_EXPIRED');
  const same = (/** @type {unknown} */ a, /** @type {unknown} */ b) => (a ?? null) === (b ?? null);
  const b = check.buyer;
  if (!same(payload.channel, b.channel) || !same(payload.clientOrgId, b.clientOrgId) || !same(payload.customerId, b.customerId))
    throw new DomainError('PRICE_TOKEN_NOT_YOURS');
  return payload;
}

/**
 * The stay the booking asks for must be the one the token priced.
 * @param {TokenPayload} payload
 * @param {Stay} stay
 */
export function assertSameStay(payload, stay) {
  const fields = /** @type {const} */ (['propertyId', 'roomTypeId', 'ratePlanId', 'checkIn', 'checkOut']);
  if (fields.some((f) => payload[f] !== stay[f]) || canonical(payload.occupancies) !== canonical(stay.occupancies))
    throw new DomainError('PRICE_TOKEN_STAY_MISMATCH');
}
