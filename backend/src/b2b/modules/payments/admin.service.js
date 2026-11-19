// @ts-check
/**
 * MusafirBaba finance views of payments (S07-T10): payments, refunds, settlement lines, reconciliation exceptions
 * (resolve with a note), a settlement file import, a manual refund (repeat-safe by the caller's request id), and a
 * small **test payment** in PayU (proves the connection end to end; refunded by hand if it was real money).
 */
import { NotFoundError } from '../../core/errors.js';
import { IntentRecord } from './models/intent.model.js';
import { ReconExceptionRecord } from './models/recon-exception.model.js';
import { RefundRecord } from './models/refund.model.js';
import { SettlementRecord } from './models/settlement.model.js';
import { createPayments } from './payments.service.js';
import { reconcileSettlements } from './reconciliation.service.js';
import { refundPayment } from './refunds.service.js';

/** @param {Record<string, any>} i */
const intentDto = (i) => ({
  id: String(i._id),
  txnId: i.txnId,
  purpose: i.purpose,
  reference: i.reference,
  amountPaise: i.amountPaise,
  refundedPaise: i.refundedPaise ?? 0,
  status: i.status,
  failureReason: i.failureReason ?? null,
  gatewayPaymentId: i.gatewayPaymentId ?? null,
  mode: i.mode ?? null,
  payer: i.payer,
  createdAt: i.createdAt,
  lastVerifiedAt: i.lastVerifiedAt ?? null,
  history: i.history ?? [],
});

/** @param {import('./payments.service.js').PaymentsDeps} deps */
export function createPaymentsAdmin(deps) {
  return {
    /** @param {{ status?: string }} f */
    async payments(f) {
      return (
        await IntentRecord.find(f.status ? { status: f.status } : {}, { pendingEvents: 0 })
          .sort({ _id: -1 })
          .limit(200)
          .lean()
      ).map(intentDto);
    },
    async refunds() {
      return RefundRecord.find({}, { pendingEvents: 0 }).sort({ _id: -1 }).limit(200).lean();
    },
    async settlements() {
      return SettlementRecord.find({}).sort({ settledOn: -1, _id: -1 }).limit(200).lean();
    },
    /** @param {{ status?: string }} f */
    async exceptions(f) {
      return ReconExceptionRecord.find({ status: f.status ?? 'OPEN' })
        .sort({ raisedAt: -1 })
        .limit(200)
        .lean();
    },
    /** @param {string} by @param {string} id @param {string} note */
    async resolveException(by, id, note) {
      const res = /^[a-f0-9]{24}$/.test(id)
        ? await ReconExceptionRecord.updateOne(
            { _id: id, status: 'OPEN' },
            { $set: { status: 'RESOLVED', resolvedBy: by, resolution: note } },
          )
        : null;
      if (!res || res.matchedCount === 0) throw new NotFoundError('EXCEPTION_NOT_FOUND');
      return ReconExceptionRecord.findById(id).lean();
    },
    /** @param {import('./reconciliation.service.js').SettlementLine[]} lines */
    importSettlements: (lines) => reconcileSettlements(deps, lines, 'FILE'),
    /** @param {string} by @param {{ intentId: string, amountPaise: number, reason: string, requestId: string }} a */
    refund: (by, a) =>
      refundPayment(deps, { intentId: a.intentId, amountPaise: a.amountPaise, key: `manual:${a.requestId}`, reason: a.reason, by }),
    /** @param {string} by @param {{ amountPaise: number, email: string, name: string, returnUrl: string }} a */
    testPayment: (by, a) =>
      createPayments(deps).createIntent({
        purpose: 'TEST',
        reference: { type: 'test', id: `${by}:${deps.clock.now().toISOString()}` },
        amountPaise: a.amountPaise,
        productinfo: 'MusafirBaba payment test',
        payer: { firstname: a.name, email: a.email },
        returnUrl: a.returnUrl,
        createdBy: by,
      }),
  };
}
