// @ts-check
/**
 * Cancelling some or all seats of a bus booking (plan Stage 18 B7) — pure.
 *   paid for the seats = each seat's sell + GST (as sold); charge = slab % of that (MusafirBaba / ops: 0 — full refund);
 *   refund = paid − charge. The per-booking fee (if any) is refunded only when ops cancel the whole booking.
 * Split of the charge (same rule as hotels, D5): the bus company keeps its share (its net ÷ paid), MusafirBaba the rest.
 * Ledger: only the refunded part is reversed — operator payable (net × refund ÷ paid... less its share), each GST line
 * pro rata, the margin takes the rest — always balancing to the refund.
 */
import { chargePercent } from '../../bus-catalog/index.js';

/**
 * @typedef {{ totalPaise: number, operatorPayablePaise: number, cgstPaise: number, sgstPaise: number, igstPaise: number }} PartTotals
 */

/**
 * What was paid for some seats (and the fee, when asked).
 * @param {{ lines: any[], fee: any }} breakdown @param {string[]} seats @param {boolean} withFee
 * @returns {PartTotals}
 */
export function seatTotals(breakdown, seats, withFee) {
  const lines = breakdown.lines.filter((l) => seats.includes(l.no));
  const sum = (/** @type {(l: any) => number} */ f) => lines.reduce((t, l) => t + f(l), 0);
  const fee = withFee && breakdown.fee ? breakdown.fee : null;
  const cgstPaise = sum((l) => l.gst.cgstPaise) + (fee?.cgstPaise ?? 0);
  const sgstPaise = sum((l) => l.gst.sgstPaise) + (fee?.sgstPaise ?? 0);
  const igstPaise = sum((l) => l.gst.igstPaise) + (fee?.igstPaise ?? 0);
  return {
    totalPaise: sum((l) => l.sellPaise) + (fee?.sellPaise ?? 0) + cgstPaise + sgstPaise + igstPaise,
    operatorPayablePaise: sum((l) => l.netPaise),
    cgstPaise,
    sgstPaise,
    igstPaise,
  };
}

/**
 * The charge and refund of cancelling now.
 * @param {{ slabs: { hoursBefore: number, percent: number }[], departAt: Date, now: Date, totals: PartTotals, waive: boolean }} a
 */
export function partCharge(a) {
  const percent = a.waive ? 0 : chargePercent(a.slabs, { departAt: a.departAt, now: a.now });
  const chargePaise = Math.min(a.totals.totalPaise, Math.round((a.totals.totalPaise * percent) / 100));
  const operatorSharePaise =
    a.totals.totalPaise > 0 ? Math.min(chargePaise, Math.round((chargePaise * a.totals.operatorPayablePaise) / a.totals.totalPaise)) : 0;
  return { percent, chargePaise, refundPaise: a.totals.totalPaise - chargePaise, operatorSharePaise };
}

/**
 * What the cancellation takes back from the confirmation's credits (the payment mode adds the refund to the buyer's
 * side). Balances to the refund.
 * @param {PartTotals} t @param {{ refundPaise: number, operatorSharePaise: number }} c
 * @returns {{ type: 'OPERATOR_PAYABLE' | 'TAX_PAYABLE_CGST' | 'TAX_PAYABLE_SGST' | 'TAX_PAYABLE_IGST' | 'REVENUE_MARGIN', debitPaise?: number, creditPaise?: number }[]}
 */
export function partReversal(t, c) {
  if (c.refundPaise <= 0 || t.totalPaise <= 0) return [];
  const payable = t.operatorPayablePaise - c.operatorSharePaise;
  const part = (/** @type {number} */ x) => Math.round((x * c.refundPaise) / t.totalPaise);
  const taxes = /** @type {const} */ ([
    ['TAX_PAYABLE_CGST', part(t.cgstPaise)],
    ['TAX_PAYABLE_SGST', part(t.sgstPaise)],
    ['TAX_PAYABLE_IGST', part(t.igstPaise)],
  ]);
  const revenue = c.refundPaise - payable - taxes.reduce((s, [, v]) => s + v, 0);
  /** @type {ReturnType<typeof partReversal>} */
  const lines = [];
  if (payable > 0) lines.push({ type: 'OPERATOR_PAYABLE', debitPaise: payable });
  for (const [type, v] of taxes) if (v > 0) lines.push({ type, debitPaise: v });
  if (revenue > 0) lines.push({ type: 'REVENUE_MARGIN', debitPaise: revenue });
  if (revenue < 0) lines.push({ type: 'REVENUE_MARGIN', creditPaise: -revenue });
  return lines;
}
