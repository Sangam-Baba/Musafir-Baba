// @ts-check
/**
 * Hotel statements per payout and statement disputes (plan Stage 15 §3.4):
 * - `payoutStatement`: one paid line — its bookings (payables), deductions and net;
 * - `raise`: the hotel disputes one of its payables (one open dispute per payable) → its next payout line is held;
 * - `resolve`: MusafirBaba accepts or rejects with a note (corrections are made with an adjustment / recorded payout).
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, NotFoundError } from '../../core/errors.js';
import { PayableRecord } from './models/payable.model.js';
import { PayoutLineRecord, PayoutRunRecord } from './models/payout-run.model.js';
import { StatementDisputeRecord } from './models/statement-dispute.model.js';

const SCOPE = systemScope('wallet: statements and disputes', { routine: true });

/** @param {Record<string, any>} d */
export const disputeDto = (d) => ({
  id: String(d._id),
  hotelOrgId: d.hotelOrgId,
  payableId: d.payableId,
  bookingRef: d.bookingRef,
  message: d.message,
  status: d.status,
  resolution: d.resolution,
  resolvedAt: d.resolvedAt,
  createdAt: d.createdAt,
});

/** Open disputes of a hotel (payout holds). @param {string} hotelOrgId */
export const openDisputes = (hotelOrgId) => StatementDisputeRecord.countDocuments({ hotelOrgId, status: 'OPEN' }).setOptions(SCOPE);

/** A hotel's paid payout line with its bookings. @param {string} hotelOrgId @param {string} lineId */
export async function payoutStatement(hotelOrgId, lineId) {
  const l = /^[a-f0-9]{24}$/.test(lineId)
    ? await PayoutLineRecord.findOne({ _id: lineId, hotelOrgId, paid: true }).setOptions(SCOPE).lean()
    : null;
  if (!l) throw new NotFoundError('PAYOUT_NOT_FOUND');
  const run = /** @type {any} */ (await PayoutRunRecord.findById(l.runId).lean());
  const payables = await PayableRecord.find({ _id: { $in: l.payableIds } })
    .setOptions(SCOPE)
    .sort({ checkOut: 1 })
    .lean();
  return {
    id: String(l._id),
    ref: run?.ref ?? null,
    paidAt: run?.paidAt ?? null,
    bankReference: run?.bankReference ?? null,
    lines: payables.map((p) => ({
      payableId: String(p._id),
      bookingRef: p.bookingRef,
      orderRef: p.orderRef,
      checkOut: p.checkOut,
      amountPaise: p.amountPaise,
    })),
    grossPaise: l.grossPaise,
    deductions: l.deductions,
    netPaise: l.netPaise,
  };
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createStatementDisputes(deps) {
  return {
    payoutStatement,
    /** @param {string} hotelOrgId @param {string} by @param {{ payableId: string, message: string }} a */
    async raise(hotelOrgId, by, a) {
      const p = /^[a-f0-9]{24}$/.test(a.payableId)
        ? await PayableRecord.findOne({ _id: a.payableId, hotelOrgId }).setOptions(SCOPE).lean()
        : null;
      if (!p) throw new NotFoundError('PAYABLE_NOT_FOUND');
      if (await StatementDisputeRecord.exists({ payableId: a.payableId, status: 'OPEN' }).setOptions(SCOPE))
        throw new ConflictError('DISPUTE_ALREADY_OPEN');
      const d = await StatementDisputeRecord.create({
        hotelOrgId,
        payableId: a.payableId,
        bookingRef: p.bookingRef,
        message: a.message.trim(),
        status: 'OPEN',
        raisedBy: by,
      });
      return disputeDto(d.toObject());
    },
    /** @param {string} hotelOrgId */
    mine: async (hotelOrgId) =>
      (await StatementDisputeRecord.find({ hotelOrgId }).setOptions(SCOPE).sort({ createdAt: -1 }).limit(100).lean()).map(disputeDto),
    /** @param {{ status?: string }} q */
    queue: async (q) =>
      (
        await StatementDisputeRecord.find({ status: q.status ?? 'OPEN' })
          .setOptions(SCOPE)
          .sort({ createdAt: 1 })
          .limit(200)
          .lean()
      ).map(disputeDto),
    /** @param {string} by @param {string} id @param {{ accept: boolean, note: string }} d */
    async resolve(by, id, d) {
      const res = await StatementDisputeRecord.updateOne(
        { _id: /^[a-f0-9]{24}$/.test(id) ? id : null, status: 'OPEN' },
        { $set: { status: d.accept ? 'ACCEPTED' : 'REJECTED', resolvedBy: by, resolvedAt: deps.clock.now(), resolution: d.note.trim() } },
      ).setOptions(SCOPE);
      if (res.modifiedCount !== 1) throw new ConflictError('DISPUTE_NOT_OPEN');
      return disputeDto(/** @type {any} */ (await StatementDisputeRecord.findById(id).setOptions(SCOPE).lean()));
    },
  };
}
