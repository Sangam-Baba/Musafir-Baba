// @ts-check
/**
 * Issuing and checking price tokens (S05-T06). Internal — search / quote screens call `issue`, booking (Stage 08)
 * calls `verifyAndReprice` with a fresh breakdown worked out from today's rates and rules:
 * - same breakdown as when the token was issued → `SAME` (book at that price);
 * - anything changed (hotel rate, rule, GST) → `CHANGED` with the new breakdown and the quoted total, so the buyer
 *   sees the new price before paying — never charged silently, never charged the old price unchecked.
 * `rotate` starts a new signing key; tokens of the old one keep verifying until they expire.
 */
import { randomBytes } from 'node:crypto';

import { assertSameStay, breakdownHash, signToken, TOKEN_MINUTES, verifyToken } from './domain/price-token.js';
import { SigningKeyRecord } from './models/signing-key.model.js';

/** Old keys verify a little longer than their last token lives (clock differences between processes). */
export const VERIFY_GRACE_MINUTES = TOKEN_MINUTES + 5;
const KEYS_CACHE_MS = 60_000;

/**
 * @typedef {import('./domain/price-token.js').Buyer} Buyer
 * @typedef {import('./domain/price-token.js').Stay} Stay
 * @typedef {import('./domain/quote.js').PriceBreakdown} PriceBreakdown
 */

/** @param {{ clock: import('../../core/clock.js').Clock, secret: string }} deps */
export function createPriceTokenService(deps) {
  if (typeof deps.secret !== 'string' || deps.secret.length < 32)
    throw new Error('[b2b] price tokens need B2B_AUTH_SECRET (≥ 32 characters)');
  /** @type {{ active: string, usable: Set<string>, at: number } | null} */
  let keys = null;
  const now = () => deps.clock.now();
  const newKid = () => `k${now().toISOString().slice(0, 10).replace(/-/g, '')}${randomBytes(4).toString('hex')}`;

  async function load() {
    let docs = await SigningKeyRecord.find({ $or: [{ status: 'ACTIVE' }, { status: 'VERIFY_ONLY', verifyUntil: { $gt: now() } }] }).lean();
    if (!docs.some((d) => d.status === 'ACTIVE')) {
      await SigningKeyRecord.create({ _id: newKid(), status: 'ACTIVE' }).catch((error) => {
        if (error?.code !== 11000) throw error; // another process created it first
      });
      docs = await SigningKeyRecord.find({ $or: [{ status: 'ACTIVE' }, { status: 'VERIFY_ONLY', verifyUntil: { $gt: now() } }] }).lean();
    }
    const active = docs.find((d) => d.status === 'ACTIVE');
    if (!active) throw new Error('[b2b] no active price-token key');
    keys = { active: String(active._id), usable: new Set(docs.map((d) => String(d._id))), at: now().getTime() };
    return keys;
  }

  /** @param {string} [needKid] reload when a token names a key this process hasn't seen yet */
  async function current(needKid) {
    const fresh = keys && now().getTime() - keys.at < KEYS_CACHE_MS;
    if (fresh && keys && (!needKid || keys.usable.has(needKid))) return keys;
    return load();
  }

  return {
    /**
     * @param {Buyer} buyer
     * @param {Stay} stay
     * @param {PriceBreakdown} breakdown
     */
    async issue(buyer, stay, breakdown) {
      const { active } = await current();
      const signed = signToken(
        { ...buyer, ...stay, totalPaise: breakdown.totals.totalPaise, breakdown },
        { secret: deps.secret, kid: active, now: now() },
      );
      return { ...signed, totalPaise: breakdown.totals.totalPaise };
    },

    /**
     * @param {string} token
     * @param {{ buyer: Buyer, stay: Stay, fresh: PriceBreakdown }} req
     * @returns {Promise<{ status: 'SAME' | 'CHANGED', breakdown: PriceBreakdown, quotedTotalPaise: number }>}
     */
    async verifyAndReprice(token, req) {
      const kid = /^[A-Za-z0-9_-]+$/.test(token.split('.')[0] ?? '') ? peekKid(token) : null;
      const { usable } = await current(kid ?? undefined);
      const payload = verifyToken(token, { secret: deps.secret, usableKids: usable, now: now(), buyer: req.buyer });
      assertSameStay(payload, req.stay);
      const same = breakdownHash(req.fresh, { secret: deps.secret, kid: payload.kid }) === payload.breakdownHash;
      return { status: same ? 'SAME' : 'CHANGED', breakdown: req.fresh, quotedTotalPaise: payload.totalPaise };
    },

    /**
     * The verified payload (signature, key, expiry, buyer) — what a price check needs to know which stay was priced.
     * @param {string} token
     * @param {Buyer} buyer
     */
    async read(token, buyer) {
      const { usable } = await current(peekKid(token) ?? undefined);
      return verifyToken(token, { secret: deps.secret, usableKids: usable, now: now(), buyer });
    },

    /** New signing key; the old one only verifies, for VERIFY_GRACE_MINUTES. */
    async rotate() {
      const until = new Date(now().getTime() + VERIFY_GRACE_MINUTES * 60_000);
      await SigningKeyRecord.updateMany({ status: 'ACTIVE' }, { $set: { status: 'VERIFY_ONLY', verifyUntil: until } });
      keys = null;
      return (await load()).active;
    },
  };
}

/** The key id named in a token (unverified — only to know which keys to load). @param {string} token */
function peekKid(token) {
  try {
    const kid = JSON.parse(Buffer.from(token.split('.')[0] ?? '', 'base64url').toString('utf8'))?.kid;
    return typeof kid === 'string' && kid.length <= 40 ? kid : null;
  } catch {
    return null;
  }
}
