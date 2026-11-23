// @ts-check
/**
 * Recording hotel payouts (plan Stage 09 §3.9, §6 "a payable is never paid twice", §7 "payout recording fraud"):
 * - `propose`: the hotel's chosen ELIGIBLE payables are **locked** to the proposal in one update (all or none); the
 *   amount must equal their sum — a payout can't exceed what is ready to pay;
 * - `decide`: a **different person** approves → one journal entry hotel payable → bank (UTR in the memo, unique by
 *   payout) → payables PAID; or rejects → payables unlocked;
 * - `statement`: a hotel's payables and payouts for a period (and a CSV of it).
 */
import { randomInt } from 'node:crypto';

import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { ManualPayoutRecord } from './models/manual-payout.model.js';
import { PayableRecord } from './models/payable.model.js';

const SCOPE = systemScope('wallet: hotel payouts', { routine: true });
const LETTERS = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const newRef = () => `PO-${Array.from({ length: 8 }, () => LETTERS[randomInt(LETTERS.length)]).join('')}`;

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, ledger: ReturnType<typeof import('./ledger.service.js').createLedger> }} PayoutDeps
 */

/** @param {Record<string, any>} p */
export const payoutDto = (p) => ({
  id: String(p._id),
  ref: p.ref,
  hotelOrgId: p.hotelOrgId,
  payableCount: p.payableIds.length,
  amountPaise: p.amountPaise,
  utr: p.utr,
  paidOn: p.paidOn,
  note: p.note,
  status: p.status,
  proposedBy: p.proposedBy,
  decidedBy: p.decidedBy,
  decidedAt: p.decidedAt,
  createdAt: p.createdAt,
});

/**
 * @param {PayoutDeps} deps
 * @param {string} by
 * @param {{ hotelOrgId: string, payableIds: string[], amountPaise: number, utr: string, paidOn: string, note?: string | null }} a
 */
async function propose(deps, by, a) {
  const ids = [...new Set(a.payableIds)].filter((id) => /^[a-f0-9]{24}$/.test(id));
  if (ids.length === 0 || ids.length !== a.payableIds.length) throw new DomainError('PAYABLES_INVALID');
  const payables = await PayableRecord.find({ _id: { $in: ids }, hotelOrgId: a.hotelOrgId })
    .setOptions(SCOPE)
    .lean();
  if (payables.length !== ids.length || payables.some((p) => p.status !== 'ELIGIBLE' || p.payoutId))
    throw new ConflictError('PAYABLES_NOT_READY');
  const sum = payables.reduce((s, p) => s + p.amountPaise, 0);
  if (a.amountPaise !== sum) throw new DomainError('PAYOUT_AMOUNT_MISMATCH', { readyPaise: sum });
  const doc = /** @type {any} */ (
    (
      await ManualPayoutRecord.create({
        ref: newRef(),
        hotelOrgId: a.hotelOrgId,
        payableIds: ids,
        amountPaise: sum,
        utr: a.utr.trim(),
        paidOn: a.paidOn,
        note: a.note ?? null,
        status: 'PROPOSED',
        proposedBy: by,
      })
    ).toObject()
  );
  const locked = await PayableRecord.updateMany(
    { _id: { $in: ids }, status: 'ELIGIBLE', payoutId: null },
    { $set: { payoutId: String(doc._id) } },
  ).setOptions(SCOPE);
  if (locked.modifiedCount !== ids.length) {
    await PayableRecord.updateMany({ payoutId: String(doc._id) }, { $set: { payoutId: null } }).setOptions(SCOPE); // someone else took one meanwhile
    await ManualPayoutRecord.updateOne(
      { _id: doc._id },
      { $set: { status: 'REJECTED', decisionNote: 'payables changed while recording' } },
    ).setOptions(SCOPE);
    throw new ConflictError('PAYABLES_NOT_READY');
  }
  return payoutDto(doc);
}

/**
 * @param {PayoutDeps} deps
 * @param {string} by
 * @param {string} id
 * @param {{ approve: boolean, note?: string | null }} d
 */
async function decide(deps, by, id, d) {
  const p = /** @type {any} */ (/^[a-f0-9]{24}$/.test(id) ? await ManualPayoutRecord.findById(id).setOptions(SCOPE).lean() : null);
  if (!p) throw new NotFoundError('PAYOUT_NOT_FOUND');
  if (p.proposedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
  const now = deps.clock.now();
  const claimed = await ManualPayoutRecord.updateOne(
    { _id: p._id, status: 'PROPOSED' },
    { $set: { status: d.approve ? 'APPROVED' : 'REJECTED', decidedBy: by, decidedAt: now, decisionNote: d.note ?? null } },
  ).setOptions(SCOPE);
  if (claimed.modifiedCount !== 1) throw new ConflictError('PAYOUT_ALREADY_DECIDED', { payoutStatus: p.status });
  if (!d.approve) {
    await PayableRecord.updateMany({ payoutId: String(p._id), status: 'ELIGIBLE' }, { $set: { payoutId: null } }).setOptions(SCOPE);
    return payoutDto({ ...p, status: 'REJECTED', decidedBy: by, decidedAt: now });
  }
  await deps.ledger.openHotelPayable(p.hotelOrgId);
  const posted = await deps.ledger.post(
    {
      reference: { type: 'hotel-payout', id: String(p._id) },
      purpose: 'hotel-payout',
      lines: [
        { accountId: await deps.ledger.accountId(p.hotelOrgId, 'PAYABLE'), debitPaise: p.amountPaise },
        { accountId: await deps.ledger.accountId('platform', 'BANK'), creditPaise: p.amountPaise },
      ],
      memo: `${p.ref} UTR ${p.utr} (${p.paidOn})`,
    },
    by,
  );
  await ManualPayoutRecord.updateOne({ _id: p._id }, { $set: { transactionId: posted.id } }).setOptions(SCOPE);
  await PayableRecord.updateMany(
    { payoutId: String(p._id), status: 'ELIGIBLE' },
    { $set: { status: 'PAID', paidAt: now }, $push: { history: { at: now, status: 'PAID' } } },
  ).setOptions(SCOPE);
  return payoutDto({ ...p, status: 'APPROVED', decidedBy: by, decidedAt: now });
}

/**
 * A hotel's statement for a period: payables by check-out date, payouts by bank date, and totals.
 * @param {string} hotelOrgId
 * @param {{ from: string, to: string }} q
 */
async function statement(hotelOrgId, q) {
  const payables = await PayableRecord.find({ hotelOrgId, checkOut: { $gte: q.from, $lte: q.to }, status: { $ne: 'VOID' } })
    .setOptions(SCOPE)
    .sort({ checkOut: 1 })
    .lean();
  const payouts = await ManualPayoutRecord.find({ hotelOrgId, status: 'APPROVED', paidOn: { $gte: q.from, $lte: q.to } })
    .setOptions(SCOPE)
    .sort({ paidOn: 1 })
    .lean();
  const sum = (/** @type {string} */ status) => payables.filter((p) => p.status === status).reduce((s, p) => s + p.amountPaise, 0);
  return {
    from: q.from,
    to: q.to,
    lines: payables.map((p) => ({
      bookingRef: p.bookingRef,
      orderRef: p.orderRef,
      checkOut: p.checkOut,
      amountPaise: p.amountPaise,
      status: p.status,
      paidAt: p.paidAt ?? null,
    })),
    payouts: payouts.map((p) => ({ ref: p.ref, utr: p.utr, paidOn: p.paidOn, amountPaise: p.amountPaise })),
    totals: {
      pendingPaise: sum('PENDING'),
      readyPaise: sum('ELIGIBLE'),
      paidPaise: sum('PAID'),
      payoutsPaise: payouts.reduce((s, p) => s + p.amountPaise, 0),
    },
  };
}

/** @param {Awaited<ReturnType<typeof statement>>} s */
export function statementCsv(s) {
  const rupees = (/** @type {number} */ p) => (p / 100).toFixed(2);
  const rows = [['type', 'reference', 'order', 'date', 'amount_inr', 'status', 'utr']];
  for (const l of s.lines) rows.push(['booking', l.bookingRef, l.orderRef, l.checkOut, rupees(l.amountPaise), l.status, '']);
  for (const p of s.payouts) rows.push(['payout', p.ref, '', p.paidOn, rupees(p.amountPaise), 'PAID', p.utr]);
  return rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
}

/** @param {PayoutDeps} deps */
export function createPayouts(deps) {
  return {
    /** @param {string} by @param {{ hotelOrgId: string, payableIds: string[], amountPaise: number, utr: string, paidOn: string, note?: string | null }} a */
    propose: (by, a) => propose(deps, by, a),
    /** @param {string} by @param {string} id @param {{ approve: boolean, note?: string | null }} d */
    decide: (by, id, d) => decide(deps, by, id, d),
    /** @param {{ status?: string }} q */
    list: async (q) =>
      (
        await ManualPayoutRecord.find(q.status ? { status: q.status } : {})
          .setOptions(SCOPE)
          .sort({ createdAt: -1 })
          .limit(200)
          .lean()
      ).map(payoutDto),
    statement,
  };
}
