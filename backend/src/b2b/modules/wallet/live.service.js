// @ts-check
/**
 * Live client wallets (plan Stage 11 §3.1–3.2) — no transactions, op ids in the account document (`01-…` §8 P2–P4):
 *   1. one conditional update moves the balance and records the op (`ops.opId` ≠ this op — never applied twice; a debit
 *      only if `available ≥ amount`), the journal entry it needs is stored with the op;
 *   2. the journal entry is posted (unique by reference — repeat-safe);
 *   3. the op is removed.
 * A crash leaves the op in the account; `reconcileOps` finishes any op older than 60 seconds. The hourly check:
 * balance = Σ the account's journal lines + ops still to post; held = Σ hold ops.
 * Only client wallets are LIVE; MusafirBaba's and hotels' accounts stay DERIVED (worked out from the journal).
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { availableOf, canTake, creditState, creditUsedOf } from './domain/live.js';
import { EVENTS } from './events.js';
import { AccountRecord } from './models/account.model.js';
import { TransactionRecord } from './models/transaction.model.js';

export const LIVE = systemScope('wallet: live client balances', { routine: true });
export const OP_STUCK_MS = 60_000;
/** Finished op ids kept on the wallet — a retry racing the end of its own op is still refused (the journal covers older). */
export const DONE_KEPT = 500;

/** @param {{ reference: { type: string, id: string }, purpose: string }} j */
const journalled = async (j) =>
  Boolean(
    await TransactionRecord.exists({ 'reference.type': j.reference.type, 'reference.id': String(j.reference.id), purpose: j.purpose }),
  );

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, ledger: ReturnType<typeof import('./ledger.service.js').createLedger> }} LiveDeps
 * @typedef {{ reference: { type: string, id: string }, purpose: string, lines: { accountId: string, debitPaise?: number, creditPaise?: number }[], memo?: string | null }} JournalSpec
 *   the counter lines; the wallet's own line is added from the op's amount
 */

/** @param {Record<string, any>} a */
export const walletDto = (a) => ({
  accountId: String(a._id),
  clientOrgId: a.ownerOrgId,
  balancePaise: a.balancePaise ?? 0,
  heldPaise: a.heldPaise ?? 0,
  creditLimitPaise: a.creditLimitPaise ?? 0,
  availablePaise: availableOf({
    balancePaise: a.balancePaise ?? 0,
    heldPaise: a.heldPaise ?? 0,
    creditLimitPaise: a.creditLimitPaise ?? 0,
  }),
  creditUsedPaise: creditUsedOf({ balancePaise: a.balancePaise ?? 0, creditLimitPaise: a.creditLimitPaise ?? 0 }),
  negativeSince: a.negativeSince ?? null,
  creditDueDays: a.creditDueDays ?? 0,
  lowBalanceThresholdPaise: a.lowBalanceThresholdPaise ?? 0,
  status: a.status,
});

/** New spending is blocked while credit is overdue (D9) — top-ups and refunds still come in. @param {Record<string, any>} w @param {Date} now */
export function assertNotOverdue(w, now) {
  const c = creditState(/** @type {any} */ (w), now);
  if (c.overdue) throw new ConflictError('CREDIT_OVERDUE', { usedPaise: c.usedPaise, dueAt: c.dueAt });
}

/** @param {string} clientOrgId */
export async function walletOf(clientOrgId) {
  const a = await AccountRecord.findOne({ ownerOrgId: clientOrgId, type: 'WALLET' }).setOptions(LIVE).lean();
  if (!a) throw new NotFoundError('WALLET_NOT_FOUND');
  return /** @type {Record<string, any>} */ (a);
}

/** `balance − held + credit limit` as a database expression. */
const AVAILABLE = { $add: [{ $subtract: ['$balancePaise', '$heldPaise'] }, '$creditLimitPaise'] };

/**
 * After a balance moved: credit in use since (set below zero, cleared at zero or above — the overdue alert too); the
 * low-balance alert once when available falls below the client's threshold, re-armed when it is back above.
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @param {unknown} id
 */
export async function trackCredit(deps, id) {
  const now = deps.clock.now();
  await AccountRecord.updateOne({ _id: id, balancePaise: { $lt: 0 }, negativeSince: null }, { $set: { negativeSince: now } }).setOptions(
    LIVE,
  );
  await AccountRecord.updateOne(
    { _id: id, balancePaise: { $gte: 0 }, $or: [{ negativeSince: { $ne: null } }, { creditOverdueAlerted: true }] },
    { $set: { negativeSince: null, creditOverdueAlerted: false } },
  ).setOptions(LIVE);
  const a = /** @type {any} */ (await AccountRecord.findById(id, { ownerOrgId: 1, lowBalanceThresholdPaise: 1 }).setOptions(LIVE).lean());
  if (!a) return;
  const event = newEvent(EVENTS.lowBalance, { orgId: a.ownerOrgId, amountPaise: a.lowBalanceThresholdPaise ?? 0 }, deps);
  await AccountRecord.updateOne(
    { _id: id, lowBalanceAlerted: false, lowBalanceThresholdPaise: { $gt: 0 }, $expr: { $lt: [AVAILABLE, '$lowBalanceThresholdPaise'] } },
    { $set: { lowBalanceAlerted: true, hasPendingEvents: true }, $push: { pendingEvents: event } },
  ).setOptions(LIVE);
  await AccountRecord.updateOne(
    { _id: id, lowBalanceAlerted: true, $expr: { $gte: [AVAILABLE, '$lowBalanceThresholdPaise'] } },
    { $set: { lowBalanceAlerted: false } },
  ).setOptions(LIVE);
}

/**
 * Steps 2–3 for an op that moved the balance: its journal entry (once), then the op removed.
 * @param {LiveDeps} deps
 * @param {Record<string, any>} account
 * @param {{ opId: string, amountPaise: number, journal: JournalSpec }} op
 * @param {string} by
 */
export async function finishOp(deps, account, op, by) {
  const amount = op.amountPaise;
  const own =
    amount >= 0 ? { accountId: String(account._id), creditPaise: amount } : { accountId: String(account._id), debitPaise: -amount };
  if (amount !== 0) await deps.ledger.post({ ...op.journal, lines: [own, ...op.journal.lines] }, by);
  await AccountRecord.updateOne(
    { _id: account._id, 'ops.opId': op.opId },
    { $pull: { ops: { opId: op.opId } }, $push: { doneOps: { $each: [op.opId], $slice: -DONE_KEPT } } },
  ).setOptions(LIVE);
}

/**
 * Move a client's live balance: + credits the client (top-up, refund), − debits it (only within what is available).
 * Repeat-safe by `opId`. Returns `{ applied: true }`, or `{ applied: false }` when this op was already done.
 * @param {LiveDeps} deps
 * @param {{ clientOrgId: string, opId: string, type: 'TOPUP' | 'REFUND' | 'ADJUST' | 'DEBIT', amountPaise: number, journal: JournalSpec, by: string }} a
 */
async function apply(deps, a) {
  if (!Number.isSafeInteger(a.amountPaise) || a.amountPaise === 0) throw new DomainError('AMOUNT_INVALID');
  const w = await walletOf(a.clientOrgId);
  if (w.status !== 'ACTIVE') throw new ConflictError('WALLET_NOT_ACTIVE');
  if (await journalled(a.journal)) return { applied: false };
  if (a.type === 'DEBIT') assertNotOverdue(w, deps.clock.now());
  const now = deps.clock.now();
  const op = { opId: a.opId, type: a.type, amountPaise: a.amountPaise, at: now, journal: a.journal };
  const res = await AccountRecord.updateOne(
    {
      _id: w._id,
      status: 'ACTIVE',
      'ops.opId': { $ne: a.opId },
      doneOps: { $ne: a.opId },
      ...(a.amountPaise < 0 ? { $expr: canTake(-a.amountPaise) } : {}),
    },
    a.type === 'TOPUP'
      ? {
          $inc: { balancePaise: a.amountPaise, version: 1 },
          $set: { hasPendingEvents: true },
          $push: {
            ops: op,
            pendingEvents: newEvent(EVENTS.topUpCredited, { orgId: a.clientOrgId, amountPaise: a.amountPaise, opId: a.opId }, deps),
          },
        }
      : { $inc: { balancePaise: a.amountPaise, version: 1 }, $push: { ops: op } },
  ).setOptions(LIVE);
  if (res.modifiedCount !== 1) {
    const now2 = await walletOf(a.clientOrgId);
    const pending = (now2.ops ?? []).find((/** @type {any} */ o) => o.opId === a.opId);
    if (pending) return finishOp(deps, now2, pending, a.by).then(() => ({ applied: false }));
    if ((now2.doneOps ?? []).includes(a.opId) || (await journalled(a.journal))) return { applied: false };
    throw new ConflictError('INSUFFICIENT_WALLET_BALANCE', { availablePaise: availableOf(/** @type {any} */ (now2)) });
  }
  await finishOp(deps, w, op, a.by);
  await trackCredit(deps, w._id);
  return { applied: true };
}

/** @param {LiveDeps} deps */
export function createLiveWallets(deps) {
  return {
    /** Opens a client's wallet (repeat-safe). @param {string} clientOrgId */
    open: (clientOrgId) => deps.ledger.openAccount(clientOrgId, 'WALLET', 'system:client-activated'),
    /** @param {string} clientOrgId */
    read: async (clientOrgId) => walletDto(await walletOf(clientOrgId)),
    /** @param {Parameters<typeof apply>[1]} a */
    apply: (a) => apply(deps, a),
    /**
     * A PayU top-up confirmed (on time or late — always credited, plan §3.4): customer advances → the wallet, once per
     * txn id. Any credit in use is settled first simply because the balance goes up.
     * @param {{ clientOrgId: string, txnId: string, amountPaise: number }} a
     */
    async topUpPaid(a) {
      await deps.ledger.openAccount(a.clientOrgId, 'WALLET', 'system:topup');
      const advances = await deps.ledger.accountId('platform', 'CUSTOMER_ADVANCES');
      return apply(deps, {
        clientOrgId: a.clientOrgId,
        opId: `topup:${a.txnId}`,
        type: 'TOPUP',
        amountPaise: a.amountPaise,
        journal: {
          reference: { type: 'wallet-topup', id: a.txnId },
          purpose: 'wallet-topup',
          lines: [{ accountId: advances, debitPaise: a.amountPaise }],
          memo: `PayU top-up ${a.txnId}`,
        },
        by: 'system:payments',
      });
    },
    /** Ops left half-way (process stopped) → journal posted, op removed. Hold ops are the holds' business. */
    async reconcileOps() {
      const before = new Date(deps.clock.now().getTime() - OP_STUCK_MS);
      const accounts = await AccountRecord.find({
        balanceMode: 'LIVE',
        ops: { $elemMatch: { type: { $ne: 'HOLD' }, at: { $lt: before } } },
      })
        .setOptions(LIVE)
        .limit(200)
        .lean();
      let finished = 0;
      for (const a of accounts)
        for (const op of (a.ops ?? []).filter((o) => o.type !== 'HOLD' && o.at < before)) {
          await finishOp(deps, a, /** @type {any} */ (op), 'system:reconciler');
          finished += 1;
        }
      return { finished };
    },
  };
}

/**
 * Hourly checks: every live balance = Σ its journal lines + ops still to post; held = Σ its hold ops; never below the floor.
 */
export function liveInvariants() {
  return [
    {
      name: 'wallet-live-balances-match-journal',
      check: async () => {
        const out = [];
        for (const a of await AccountRecord.find({ balanceMode: 'LIVE' }).setOptions(LIVE).limit(5000).lean()) {
          const [sum] = await TransactionRecord.aggregate([
            { $match: { 'lines.accountId': String(a._id) } },
            { $unwind: '$lines' },
            { $match: { 'lines.accountId': String(a._id) } },
            { $group: { _id: null, d: { $sum: '$lines.debitPaise' }, c: { $sum: '$lines.creditPaise' } } },
          ]);
          const pending = (a.ops ?? []).filter((o) => o.type !== 'HOLD').reduce((s, o) => s + (o.amountPaise ?? 0), 0);
          const held = (a.ops ?? []).filter((o) => o.type === 'HOLD').reduce((s, o) => s + (o.amountPaise ?? 0), 0);
          const journal = (sum?.c ?? 0) - (sum?.d ?? 0);
          if (journal + pending !== (a.balancePaise ?? 0))
            out.push({ id: String(a._id), detail: `balance ${a.balancePaise}, journal ${journal} + pending ${pending}` });
          if (held !== (a.heldPaise ?? 0)) out.push({ id: String(a._id), detail: `held ${a.heldPaise}, hold ops ${held}` });
          if (availableOf(/** @type {any} */ (a)) + (a.heldPaise ?? 0) < 0)
            out.push({ id: String(a._id), detail: 'below the credit floor' });
        }
        return out;
      },
    },
  ];
}
