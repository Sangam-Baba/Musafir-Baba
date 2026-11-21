// @ts-check
/**
 * Wallet adjustments (plan Stage 11 §3.9 — maker–checker, reason codes): a client's live balance is never edited; a
 * finance person proposes `+` (credit, e.g. goodwill) or `−` (debit, e.g. a top-up credited twice by the bank) against
 * one MusafirBaba account, a **different** person approves:
 *   PROPOSED → POSTING (claimed by the approver) → wallet op `adjustment:<id>` + journal `adjustment/<id>` → POSTED
 * A debit needs the money to be there (never below the credit floor) — otherwise the approval is refused and the
 * proposal stays open. POSTING cut short is finished by `finishDue`. Also: refunds into a wallet (`refundToWallet`).
 */
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { PLATFORM_ACCOUNT_TYPES } from './domain/accounts.js';
import { AdjustmentRecord } from './models/adjustment.model.js';

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, ledger: ReturnType<typeof import('./ledger.service.js').createLedger>,
 *   wallets: ReturnType<typeof import('./live.service.js').createLiveWallets> }} WalletAdjustDeps
 */

/** @param {Record<string, any>} d */
export const walletAdjustmentDto = (d) => ({
  id: String(d._id),
  clientOrgId: d.clientOrgId,
  amountPaise: d.amountPaise,
  counterAccountId: d.lines?.[0]?.accountId ?? null,
  reasonCode: d.reasonCode,
  note: d.note,
  status: d.status,
  proposedBy: d.proposedBy,
  decidedBy: d.decidedBy ?? null,
  decidedAt: d.decidedAt ?? null,
  decisionNote: d.decisionNote ?? null,
  createdAt: d.createdAt,
});

/** @param {string} id */
async function load(id) {
  const d = /^[a-f0-9]{24}$/.test(id) ? await AdjustmentRecord.findOne({ _id: id, kind: 'WALLET' }).lean() : null;
  if (!d) throw new NotFoundError('ADJUSTMENT_NOT_FOUND');
  return /** @type {Record<string, any>} */ (d);
}

/** The wallet op + journal entry (repeat-safe), then POSTED. @param {WalletAdjustDeps} deps @param {Record<string, any>} a */
async function post(deps, a) {
  const amount = a.amountPaise;
  const counter = a.lines[0].accountId;
  await deps.wallets.apply({
    clientOrgId: a.clientOrgId,
    opId: `adjustment:${String(a._id)}`,
    type: 'ADJUST',
    amountPaise: amount,
    journal: {
      reference: { type: 'adjustment', id: String(a._id) },
      purpose: 'wallet-adjustment',
      lines: [amount > 0 ? { accountId: counter, debitPaise: amount } : { accountId: counter, creditPaise: -amount }],
      memo: `${a.reasonCode}: ${a.note}`.slice(0, 500),
    },
    by: a.decidedBy,
  });
  await AdjustmentRecord.updateOne({ _id: a._id, status: 'POSTING' }, { $set: { status: 'POSTED' } });
}

/**
 * @param {WalletAdjustDeps} deps
 * @param {string} by
 * @param {{ clientOrgId: string, amountPaise: number, counterType: string, reasonCode: string, note: string }} input
 */
async function propose(deps, by, input) {
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise === 0) throw new DomainError('AMOUNT_INVALID');
  if (!PLATFORM_ACCOUNT_TYPES.includes(input.counterType)) throw new DomainError('ACCOUNT_TYPE_UNKNOWN', { type: input.counterType });
  await deps.wallets.read(input.clientOrgId); // the wallet exists
  const counter = await deps.ledger.accountId('platform', /** @type {any} */ (input.counterType));
  const d = await AdjustmentRecord.create({
    kind: 'WALLET',
    clientOrgId: input.clientOrgId,
    amountPaise: input.amountPaise,
    reasonCode: input.reasonCode,
    note: input.note,
    lines: [{ accountId: counter, debitPaise: 0, creditPaise: 0 }],
    status: 'PROPOSED',
    proposedBy: by,
  });
  return walletAdjustmentDto(d.toObject());
}

/** @param {WalletAdjustDeps} deps @param {string} by @param {string} id @param {{ approve: boolean, note?: string | null }} d */
async function decide(deps, by, id, d) {
  const a = await load(id);
  if (a.proposedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
  const set = { status: d.approve ? 'POSTING' : 'REJECTED', decidedBy: by, decidedAt: deps.clock.now(), decisionNote: d.note ?? null };
  const res = await AdjustmentRecord.updateOne({ _id: a._id, status: 'PROPOSED' }, { $set: set });
  if (res.modifiedCount !== 1) throw new ConflictError('ADJUSTMENT_ALREADY_DECIDED', { adjustmentStatus: a.status });
  if (d.approve)
    try {
      await post(deps, { ...a, ...set });
    } catch (error) {
      if (/** @type {any} */ (error)?.code !== 'INSUFFICIENT_WALLET_BALANCE') throw error; // anything else: finishDue retries
      await AdjustmentRecord.updateOne(
        { _id: a._id, status: 'POSTING' },
        { $set: { status: 'PROPOSED', decidedBy: null, decidedAt: null } },
      );
      throw error;
    }
  return walletAdjustmentDto(await load(id));
}

/** @param {WalletAdjustDeps} deps */
export function createWalletAdjustments(deps) {
  return {
    /** @param {string} by @param {Parameters<typeof propose>[2]} input */
    propose: (by, input) => propose(deps, by, input),
    /** @param {string} by @param {string} id @param {{ approve: boolean, note?: string | null }} d */
    decide: (by, id, d) => decide(deps, by, id, d),
    /** @param {{ clientOrgId?: string }} q */
    list: async (q) =>
      (
        await AdjustmentRecord.find({ kind: 'WALLET', ...(q.clientOrgId ? { clientOrgId: q.clientOrgId } : {}) })
          .sort({ createdAt: -1 })
          .limit(200)
          .lean()
      ).map(walletAdjustmentDto),
    /** Approved adjustments cut short → posted. */
    async finishDue() {
      const due = await AdjustmentRecord.find({ kind: 'WALLET', status: 'POSTING' }).limit(100).lean();
      for (const a of due) await post(deps, a).catch(() => undefined); // a debit no longer covered waits for finance
      return { adjustmentsFinished: due.length };
    },
  };
}

/**
 * Money back into a client's wallet (plan §3.7 — instant, repeat-safe by reference; used by B2B cancellations).
 * The caller gives the MusafirBaba side (what the refund comes out of).
 * @param {WalletAdjustDeps} deps
 * @param {{ clientOrgId: string, reference: { type: string, id: string }, amountPaise: number,
 *   lines: { accountId: string, debitPaise?: number, creditPaise?: number }[], memo?: string | null, by: string }} a
 */
export async function refundToWallet(deps, a) {
  if (!Number.isSafeInteger(a.amountPaise) || a.amountPaise <= 0) throw new DomainError('AMOUNT_INVALID');
  await deps.ledger.openAccount(a.clientOrgId, 'WALLET', 'system:refund');
  return deps.wallets.apply({
    clientOrgId: a.clientOrgId,
    opId: `refund:${a.reference.type}:${a.reference.id}`,
    type: 'REFUND',
    amountPaise: a.amountPaise,
    journal: { reference: a.reference, purpose: 'wallet-refund', lines: a.lines, memo: a.memo ?? null },
    by: a.by,
  });
}
