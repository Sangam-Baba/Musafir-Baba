// @ts-check
/** Reconciliation exceptions for finance (`pay_recon_exceptions`) — one per kind + key, so raising again is harmless. */
import { ReconExceptionRecord } from './models/recon-exception.model.js';

/**
 * One exception per kind + key (repeat-safe).
 * @param {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger }} deps
 * @param {{ kind: string, key: string, txnId?: string | null, detail: string, amountPaise?: number | null }} e
 */
export async function raiseException(deps, e) {
  await ReconExceptionRecord.updateOne(
    { kind: e.kind, key: e.key },
    { $setOnInsert: { ...e, txnId: e.txnId ?? null, amountPaise: e.amountPaise ?? null, status: 'OPEN', raisedAt: deps.clock.now() } },
    { upsert: true },
  );
  deps.logger.warn({ kind: e.kind, txnId: e.txnId }, 'payments: reconciliation exception');
}
