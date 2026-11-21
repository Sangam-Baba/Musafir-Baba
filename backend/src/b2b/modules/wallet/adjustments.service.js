// @ts-check
/**
 * Correcting entries (S07-T10, maker–checker): propose (balanced lines, reason code, note) → a **different** person
 * approves → posted to the journal once (reference `adjustment/<id>`), or rejects with a reason. The status move is
 * conditional, and the journal entry is unique by reference, so a repeated approval posts nothing new.
 * Client wallets (LIVE) can't be touched here — their balance moves only through a wallet adjustment (Stage 11).
 */
import { DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { checkEntry } from './domain/journal.js';
import { AccountRecord } from './models/account.model.js';
import { AdjustmentRecord } from './models/adjustment.model.js';
import { TransactionRecord } from './models/transaction.model.js';

/** @param {{ accountId: string }[]} lines */
async function refuseLive(lines) {
  const ids = lines.map((l) => l.accountId).filter((id) => /^[a-f0-9]{24}$/.test(id));
  const live = await AccountRecord.exists({ _id: { $in: ids }, balanceMode: 'LIVE' }).setOptions({
    tenantScope: 'SYSTEM',
    tenantReason: 'wallet: adjustments',
  });
  if (live) throw new DomainError('LIVE_ACCOUNT_NEEDS_WALLET_ADJUSTMENT');
}

/** @param {Record<string, any>} d */
const dto = (d) => ({
  id: String(d._id),
  reasonCode: d.reasonCode,
  note: d.note,
  lines: d.lines,
  status: d.status,
  proposedBy: d.proposedBy,
  decidedBy: d.decidedBy ?? null,
  decidedAt: d.decidedAt ?? null,
  decisionNote: d.decisionNote ?? null,
  transactionId: d.transactionId ?? null,
  createdAt: d.createdAt,
});

/** @param {{ clock: import('../../core/clock.js').Clock, ledger: ReturnType<typeof import('./ledger.service.js').createLedger> }} deps */
export function createAdjustments(deps) {
  /** @param {string} id */
  const load = async (id) => {
    const d = /^[a-f0-9]{24}$/.test(id) ? await AdjustmentRecord.findById(id).lean() : null;
    if (!d) throw new NotFoundError('ADJUSTMENT_NOT_FOUND');
    return d;
  };
  return {
    async list() {
      return (
        await AdjustmentRecord.find({ kind: { $ne: 'WALLET' } })
          .sort({ createdAt: -1 })
          .limit(200)
          .lean()
      ).map(dto);
    },
    /** @param {string} by @param {{ reasonCode: string, note: string, lines: { accountId: string, debitPaise?: number, creditPaise?: number }[] }} input */
    async propose(by, input) {
      const lines = checkEntry({ reference: { type: 'adjustment', id: 'proposal' }, purpose: 'adjustment', lines: input.lines });
      await refuseLive(lines);
      return dto(
        (
          await AdjustmentRecord.create({ reasonCode: input.reasonCode, note: input.note, lines, status: 'PROPOSED', proposedBy: by })
        ).toObject(),
      );
    },
    /** @param {string} by @param {string} id @param {{ approve: boolean, note?: string | null }} d */
    async decide(by, id, d) {
      const a = /** @type {Record<string, any>} */ (await load(id));
      if (a.proposedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
      if (a.status !== 'PROPOSED') throw new DomainError('ADJUSTMENT_STATUS', { status: a.status });
      if (a.kind === 'WALLET') throw new DomainError('ADJUSTMENT_IS_WALLET');
      if (d.approve) await refuseLive(a.lines);
      if (!d.approve) {
        await AdjustmentRecord.updateOne(
          { _id: a._id, status: 'PROPOSED' },
          { $set: { status: 'REJECTED', decidedBy: by, decidedAt: deps.clock.now(), decisionNote: d.note ?? null } },
        );
        return dto(await load(id));
      }
      const posted = await deps.ledger.post(
        {
          reference: { type: 'adjustment', id: String(a._id) },
          purpose: 'adjustment',
          lines: a.lines,
          memo: `${a.reasonCode}: ${a.note}`.slice(0, 500),
        },
        by,
      );
      await AdjustmentRecord.updateOne(
        { _id: a._id, status: 'PROPOSED' },
        { $set: { status: 'POSTED', decidedBy: by, decidedAt: deps.clock.now(), decisionNote: d.note ?? null, transactionId: posted.id } },
      );
      return dto(await load(id));
    },
  };
}

/** Recent journal entries touching an account (account explorer). @param {string} accountId */
export async function entriesOf(accountId) {
  const docs = await TransactionRecord.find({ 'lines.accountId': accountId }).sort({ _id: -1 }).limit(100).lean();
  return docs.map((t) => ({
    id: String(t._id),
    reference: t.reference,
    purpose: t.purpose,
    memo: t.memo ?? null,
    at: t.at,
    createdBy: t.createdBy,
    lines: t.lines,
  }));
}
