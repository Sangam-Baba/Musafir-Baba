// @ts-check
/**
 * Margin rules (plan Stage 05 §2a, §3.1–3.2). Pure.
 * - A rule matches on any of: channels, client category, client, hotel company, property, city, star rating and a
 *   stay-date range; an empty field matches everything. It is in force between `effectiveFrom` and `effectiveTo`.
 * - Nightly rules (FIXED_PER_NIGHT, PERCENT with optional min / max) are chosen **per night** (a New Year rule
 *   applies only to those nights). The winner: highest priority, then the most specific (most match fields set),
 *   then the oldest, then the id — the same answer whatever order the rules come in.
 * - Per-booking fees (FIXED_PER_BOOKING) are a separate, optional layer: the best matching one is added once.
 * - No nightly rule for a night → that night is **not sellable** (never sold at zero margin by accident).
 * - A margin below zero (sell under the hotel's rate) only on a rule that says so (`allowBelowNet`, approved).
 */
import { DomainError } from '../../../core/errors.js';
import { Money } from '../../../core/money.js';

export const CHANNELS = /** @type {const} */ (['WEBSITE', 'B2B_PORTAL', 'B2B_API']);
export const ADJUSTMENTS = /** @type {const} */ (['FIXED_PER_NIGHT', 'PERCENT', 'FIXED_PER_BOOKING']);
/** Largest margin a rule may add: ₹1,00,000 per night / booking, or 500 % — a typo is refused, not sold. */
export const MAX_FIXED_PAISE = 10_000_000;
export const MAX_PERCENT_BPS = 50_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MATCH_FIELDS = /** @type {const} */ (['clientCategory', 'clientOrgId', 'hotelOrgId', 'propertyId', 'cityId', 'starRating']);

/**
 * @typedef {typeof CHANNELS[number]} Channel
 * @typedef {{ channels?: Channel[], clientCategory?: string, clientOrgId?: string, hotelOrgId?: string,
 *   propertyId?: string, cityId?: string, starRating?: number, stayFrom?: string, stayTo?: string }} RuleMatch
 * @typedef {{ type: typeof ADJUSTMENTS[number], value: number, minPaise?: number | null, maxPaise?: number | null }} Adjustment
 * @typedef {{ id: string, name: string, priority: number, match: RuleMatch, adjustment: Adjustment,
 *   allowBelowNet?: boolean, effectiveFrom?: Date | null, effectiveTo?: Date | null, createdAt: Date,
 *   replaces?: string | null }} MarginRule
 * @typedef {{ channel: Channel, clientCategory?: string | null, clientOrgId?: string | null, hotelOrgId: string,
 *   propertyId: string, cityId?: string | null, starRating?: number | null }} PriceContext
 * @typedef {{ ruleId: string, marginPaise: number }} NightMargin
 */

/**
 * Every problem with a rule at once (MARGIN_RULE_INVALID details).
 * @param {Omit<MarginRule, 'id' | 'createdAt'>} r
 * @returns {{ code: string, field: string }[]}
 */
export function marginRuleProblems(r) {
  const out = [];
  if (!Number.isSafeInteger(r.priority) || r.priority < 0 || r.priority > 1000) out.push({ code: 'PRIORITY_INVALID', field: 'priority' });
  out.push(...matchProblems(r.match ?? {}));
  if (r.effectiveFrom && r.effectiveTo && r.effectiveTo <= r.effectiveFrom) out.push({ code: 'DATE_RANGE', field: 'effectiveTo' });
  out.push(...adjustmentProblems(r.adjustment, r.allowBelowNet === true));
  return out;
}

/** @param {RuleMatch} m */
function matchProblems(m) {
  const out = [];
  if (m.channels && (m.channels.length === 0 || m.channels.some((c) => !CHANNELS.includes(c))))
    out.push({ code: 'CHANNEL_INVALID', field: 'match.channels' });
  if (m.starRating !== undefined && (!Number.isInteger(m.starRating) || m.starRating < 0 || m.starRating > 5))
    out.push({ code: 'STAR_INVALID', field: 'match.starRating' });
  if (m.stayFrom !== undefined && !DATE.test(m.stayFrom)) out.push({ code: 'DATE_INVALID', field: 'match.stayFrom' });
  if (m.stayTo !== undefined && (!DATE.test(m.stayTo) || (m.stayFrom !== undefined && m.stayTo < m.stayFrom)))
    out.push({ code: 'DATE_RANGE', field: 'match.stayTo' });
  return out;
}

/**
 * @param {Adjustment} a
 * @param {boolean} belowNet
 */
function adjustmentProblems(a, belowNet) {
  const out = [];
  if (!ADJUSTMENTS.includes(a.type)) return [{ code: 'ADJUSTMENT_INVALID', field: 'adjustment.type' }];
  const limit = a.type === 'PERCENT' ? MAX_PERCENT_BPS : MAX_FIXED_PAISE;
  if (!Number.isSafeInteger(a.value) || Math.abs(a.value) > limit) out.push({ code: 'VALUE_INVALID', field: 'adjustment.value' });
  else if (a.value < 0 && !belowNet) out.push({ code: 'BELOW_NET_NOT_ALLOWED', field: 'adjustment.value' });
  const bounds = [a.minPaise, a.maxPaise].filter((v) => v !== undefined && v !== null);
  if (bounds.length > 0 && a.type !== 'PERCENT') out.push({ code: 'BOUNDS_ONLY_FOR_PERCENT', field: 'adjustment.minPaise' });
  if (bounds.some((v) => !Number.isSafeInteger(v) || Math.abs(/** @type {number} */ (v)) > MAX_FIXED_PAISE))
    out.push({ code: 'VALUE_INVALID', field: 'adjustment.maxPaise' });
  if (typeof a.minPaise === 'number' && typeof a.maxPaise === 'number' && a.maxPaise < a.minPaise)
    out.push({ code: 'BOUNDS_RANGE', field: 'adjustment.maxPaise' });
  return out;
}

/**
 * Number of match fields set (the stay-date range counts once, channels once).
 * @param {RuleMatch} m
 */
export function specificity(m) {
  const fields = MATCH_FIELDS.filter((f) => m[f] !== undefined && m[f] !== null).length;
  return fields + (m.channels ? 1 : 0) + (m.stayFrom || m.stayTo ? 1 : 0);
}

/**
 * @param {MarginRule} r
 * @param {PriceContext} ctx
 * @param {{ date: string, now: Date }} at stay date and the moment of pricing
 */
export function ruleMatches(r, ctx, at) {
  const m = r.match ?? {};
  if (r.effectiveFrom && at.now < r.effectiveFrom) return false;
  if (r.effectiveTo && at.now >= r.effectiveTo) return false;
  if (m.channels && !m.channels.includes(ctx.channel)) return false;
  if (MATCH_FIELDS.some((f) => m[f] !== undefined && m[f] !== null && m[f] !== ctx[f])) return false;
  if (m.stayFrom && at.date < m.stayFrom) return false;
  return !(m.stayTo && at.date > m.stayTo);
}

/**
 * Deterministic order: priority desc, specificity desc, oldest first, then id.
 * @param {MarginRule} a
 * @param {MarginRule} b
 */
export function compareRules(a, b) {
  return (
    b.priority - a.priority ||
    specificity(b.match ?? {}) - specificity(a.match ?? {}) ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/**
 * Margin amount for one room-night or booking. PERCENT is half-up to the paisa (away from zero), then clamped.
 * @param {Adjustment} a
 * @param {number} netPaise
 */
export function marginAmount(a, netPaise) {
  if (a.type !== 'PERCENT') return a.value;
  const share = Money.inr(netPaise).percent(Math.abs(a.value)).paise * Math.sign(a.value);
  const low = typeof a.minPaise === 'number' ? Math.max(share, a.minPaise) : share;
  return typeof a.maxPaise === 'number' ? Math.min(low, a.maxPaise) : low;
}

/**
 * The winning nightly rule and its margin for one room on one night.
 * @param {readonly MarginRule[]} rules active rules
 * @param {PriceContext} ctx
 * @param {{ date: string, now: Date, netPaise: number }} night
 * @returns {NightMargin}
 */
export function nightMargin(rules, ctx, night) {
  const winner = rules.filter((r) => r.adjustment.type !== 'FIXED_PER_BOOKING' && ruleMatches(r, ctx, night)).sort(compareRules)[0];
  if (!winner) throw new DomainError('NOT_SELLABLE', { reason: 'NO_MARGIN_RULE', channel: ctx.channel, date: night.date });
  const marginPaise = marginAmount(winner.adjustment, night.netPaise);
  if (night.netPaise + marginPaise < 1) throw new DomainError('NOT_SELLABLE', { reason: 'PRICE_BELOW_ONE_PAISA', ruleId: winner.id });
  return { ruleId: winner.id, marginPaise };
}

/**
 * The optional per-booking fee (matched on the check-in date). Null when no fee rule matches.
 * @param {readonly MarginRule[]} rules
 * @param {PriceContext} ctx
 * @param {{ date: string, now: Date }} at
 * @returns {NightMargin | null}
 */
export function bookingFee(rules, ctx, at) {
  const winner = rules.filter((r) => r.adjustment.type === 'FIXED_PER_BOOKING' && ruleMatches(r, ctx, at)).sort(compareRules)[0];
  return winner ? { ruleId: winner.id, marginPaise: winner.adjustment.value } : null;
}

/** The two rules seeded at first start (plan §2a) — editable by admins through the approval flow. */
export const DEFAULT_RULES = Object.freeze([
  {
    key: 'default-website',
    name: 'Website default',
    priority: 0,
    match: { channels: /** @type {Channel[]} */ (['WEBSITE']) },
    adjustment: { type: /** @type {const} */ ('FIXED_PER_NIGHT'), value: 25_000 },
  },
  {
    key: 'default-b2b',
    name: 'B2B default',
    priority: 0,
    match: { channels: /** @type {Channel[]} */ (['B2B_PORTAL', 'B2B_API']) },
    adjustment: { type: /** @type {const} */ ('FIXED_PER_NIGHT'), value: 15_000 },
  },
]);
