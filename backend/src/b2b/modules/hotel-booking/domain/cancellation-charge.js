// @ts-check
/**
 * Cancellation charges (`04-…` §8.4, plan Stage 09 §3.4) — pure. From the policy copy kept with the booking:
 *   deadline(rule) = hotel-local (check-in date + check-in time) − rule.hoursBefore − buffer hours
 *   rule           = the strictest rule whose deadline has passed (none → free); non-refundable → 100 %
 *   charge         = PERCENT → round(paid × value / 100) | NIGHTS → the first N nights (price + GST) | FIXED → value
 *   charge         = min(charge, paid); refund = paid − charge
 * A deadline "has passed" only after its exact moment (at the moment itself the cheaper terms still apply).
 * Split of the charge (D5, owner for now): the hotel keeps its share (hotel payable ÷ total), MusafirBaba the rest.
 */
import { hotelDeadline } from '../../../core/dates.js';
import { penaltyText } from '../../hotel-inventory/index.js';

export const DEFAULT_CHECK_IN_TIME = '14:00';
const HOUR = 3_600_000;

/**
 * @typedef {{ type: 'PERCENT' | 'NIGHTS' | 'FIXED', value: number }} Penalty
 * @typedef {{ nonRefundable: boolean, rules: { hoursBefore: number, penalty: Penalty }[], noShow: Penalty | null, summary: string }} PolicyCopy
 */

/** @param {{ checkIn: string }} stay @param {{ checkInTime?: string | null, timeZone?: string | null }} property */
export const checkInAt = (stay, property) =>
  hotelDeadline(
    /** @type {any} */ (stay.checkIn),
    property.checkInTime && /^\d{2}:\d{2}$/.test(property.checkInTime) ? property.checkInTime : DEFAULT_CHECK_IN_TIME,
    property.timeZone ?? 'Asia/Kolkata',
  );

/**
 * The policy's moments: free until when, then which charge from when (furthest from check-in first).
 * @param {PolicyCopy} policy
 * @param {Date} checkIn the check-in moment
 * @param {number} [bufferHours]
 */
export function deadlines(policy, checkIn, bufferHours = 0) {
  if (policy.nonRefundable)
    return {
      nonRefundable: true,
      freeUntil: null,
      steps: [{ from: null, penalty: /** @type {Penalty} */ ({ type: 'PERCENT', value: 100 }), text: 'the full booking amount' }],
    };
  const rules = [...policy.rules].sort((a, b) => b.hoursBefore - a.hoursBefore);
  const at = (/** @type {number} */ h) => new Date(checkIn.getTime() - (h + bufferHours) * HOUR);
  return {
    nonRefundable: false,
    freeUntil: rules[0] ? at(rules[0].hoursBefore) : null, // null = free until check-in
    steps: rules.map((r) => ({ from: at(r.hoursBefore), penalty: r.penalty, text: penaltyText(r.penalty) })),
  };
}

/**
 * The rule that applies at `now` (strictest whose deadline has passed), or null when free.
 * @param {PolicyCopy} policy
 * @param {{ checkIn: Date, now: Date, bufferHours?: number }} a
 * @returns {Penalty | null}
 */
export function penaltyNow(policy, a) {
  if (policy.nonRefundable) return { type: 'PERCENT', value: 100 };
  const passed = policy.rules.filter((r) => a.now.getTime() > a.checkIn.getTime() - (r.hoursBefore + (a.bufferHours ?? 0)) * HOUR);
  if (passed.length === 0) return null;
  return passed.reduce((strictest, r) => (r.hoursBefore < strictest.hoursBefore ? r : strictest)).penalty;
}

/**
 * Night prices with GST, in date order (all rooms of a night together) — for NIGHTS penalties.
 * @param {{ lines: { date: string, sellPaise: number, gst: { gstPaise: number } }[] }} breakdown
 */
export function nightAmounts(breakdown) {
  /** @type {Map<string, number>} */
  const byDate = new Map();
  for (const l of breakdown.lines) byDate.set(l.date, (byDate.get(l.date) ?? 0) + l.sellPaise + l.gst.gstPaise);
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, paise]) => paise);
}

/**
 * The charge and refund of cancelling now.
 * @param {{ policy: PolicyCopy, checkIn: Date, now: Date, bufferHours?: number, paidPaise: number, nights: number[] }} a
 */
export function cancellationCharge(a) {
  const penalty = penaltyNow(a.policy, a);
  let charge = 0;
  if (penalty?.type === 'PERCENT') charge = Math.round((a.paidPaise * penalty.value) / 100);
  else if (penalty?.type === 'NIGHTS') charge = a.nights.slice(0, penalty.value).reduce((s, n) => s + n, 0);
  else if (penalty?.type === 'FIXED') charge = penalty.value;
  charge = Math.min(Math.max(charge, 0), a.paidPaise);
  return { penalty, chargePaise: charge, refundPaise: a.paidPaise - charge };
}

/**
 * D5 (owner, for now): the hotel keeps its share of the charge — hotel payable ÷ total — MusafirBaba the rest.
 * @param {{ chargePaise: number, totalPaise: number, hotelPayablePaise: number }} a
 */
export function splitCharge(a) {
  const hotel = a.totalPaise > 0 ? Math.round((a.chargePaise * a.hotelPayablePaise) / a.totalPaise) : 0;
  return { hotelPaise: Math.min(hotel, a.chargePaise), musafirbabaPaise: a.chargePaise - Math.min(hotel, a.chargePaise) };
}

/**
 * What a cancellation takes back from the confirmation's credits (the payment mode adds the credit of the refund to the
 * buyer's side — PayU: customer advances). Only the refunded part is reversed:
 *   hotel payable  ← payable − the hotel's share of the charge (= payable × refund ÷ total)
 *   GST payable    ← each part × refund ÷ total (the credit note's GST)
 *   margin revenue ← the rest (a credit when the margin gave more than it had)
 * Always balances to the refund.
 * @param {{ totalPaise: number, hotelPayablePaise: number, cgstPaise: number, sgstPaise: number, igstPaise: number }} t
 * @param {{ chargePaise: number, refundPaise: number }} c
 * @returns {{ type: 'PAYABLE' | 'TAX_PAYABLE_CGST' | 'TAX_PAYABLE_SGST' | 'TAX_PAYABLE_IGST' | 'REVENUE_MARGIN', debitPaise?: number, creditPaise?: number }[]}
 */
export function cancellationReversal(t, c) {
  if (c.refundPaise <= 0 || t.totalPaise <= 0) return [];
  const { hotelPaise } = splitCharge({ chargePaise: c.chargePaise, totalPaise: t.totalPaise, hotelPayablePaise: t.hotelPayablePaise });
  const payable = t.hotelPayablePaise - hotelPaise;
  const part = (/** @type {number} */ x) => Math.round((x * c.refundPaise) / t.totalPaise);
  const taxes = /** @type {const} */ ([
    ['TAX_PAYABLE_CGST', part(t.cgstPaise)],
    ['TAX_PAYABLE_SGST', part(t.sgstPaise)],
    ['TAX_PAYABLE_IGST', part(t.igstPaise)],
  ]);
  const revenue = c.refundPaise - payable - taxes.reduce((s, [, v]) => s + v, 0);
  /** @type {ReturnType<typeof cancellationReversal>} */
  const lines = [];
  if (payable > 0) lines.push({ type: 'PAYABLE', debitPaise: payable });
  for (const [type, v] of taxes) if (v > 0) lines.push({ type, debitPaise: v });
  if (revenue > 0) lines.push({ type: 'REVENUE_MARGIN', debitPaise: revenue });
  if (revenue < 0) lines.push({ type: 'REVENUE_MARGIN', creditPaise: -revenue });
  return lines;
}

/**
 * A penalty applied to what was paid (shared by cancellations and no-shows): percent, the first N nights, or fixed —
 * never more than paid.
 * @param {Penalty | null} penalty
 * @param {{ paidPaise: number, nights: number[] }} a
 */
export function chargeFor(penalty, a) {
  let charge = 0;
  if (penalty?.type === 'PERCENT') charge = Math.round((a.paidPaise * penalty.value) / 100);
  else if (penalty?.type === 'NIGHTS') charge = a.nights.slice(0, penalty.value).reduce((s, n) => s + n, 0);
  else if (penalty?.type === 'FIXED') charge = penalty.value;
  charge = Math.min(Math.max(charge, 0), a.paidPaise);
  return { chargePaise: charge, refundPaise: a.paidPaise - charge };
}

/**
 * When a hotel may mark a no-show (plan Stage 09 §6): from 12:00 on the check-in day until the end of the check-out
 * day, hotel time.
 * @param {{ checkIn: string, checkOut: string }} stay
 * @param {string} timeZone
 */
export function noShowWindow(stay, timeZone) {
  const next = new Date(Date.parse(`${stay.checkOut}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  return {
    from: hotelDeadline(/** @type {any} */ (stay.checkIn), '12:00', timeZone),
    until: hotelDeadline(/** @type {any} */ (next), '00:00', timeZone),
  };
}
