// @ts-check
/**
 * What MusafirBaba owes a bus company for one booking (plan Stage 18 B7) — pure.
 *   owed = net fares of the seats still travelling + the company's share of every cancellation charge
 *   state: PENDING while the trip hasn't ended; ELIGIBLE once it has (COMPLETED) or the booking is fully cancelled;
 *          VOID when nothing is owed. PAID is set only by a payout run (then never changed).
 * Always equals what the booking left on the company's OPERATOR_PAYABLE account (confirmation credit − reversals).
 */

/** @param {Record<string, any>} b a bus booking */
export function owedOf(b) {
  const cancelled = new Set(b.cancelledSeats ?? []);
  const lines = (b.price?.lines ?? []).filter((/** @type {any} */ l) => !cancelled.has(l.no));
  const travelling = lines.reduce((/** @type {number} */ s, /** @type {any} */ l) => s + l.netPaise, 0);
  const shares = (b.parts ?? [])
    .filter((/** @type {any} */ p) => p.status === 'DONE')
    .reduce((/** @type {number} */ s, /** @type {any} */ p) => s + (p.operatorSharePaise ?? 0), 0);
  const amountPaise = travelling + shares;
  const ended = b.status === 'COMPLETED' || b.status === 'CANCELLED';
  /** @type {'PENDING' | 'ELIGIBLE' | 'VOID'} */
  const state = amountPaise === 0 && ended ? 'VOID' : ended ? 'ELIGIBLE' : 'PENDING';
  return { amountPaise, state };
}
