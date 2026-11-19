// @ts-check
/**
 * Derived balances (S07-T04). Every few minutes the roll-up reads the next journal entries (in id order, a batch at a
 * time) and adds each account's lines to its snapshot. Repeat-safe without transactions: an account's snapshot only
 * takes lines newer than its own `asOfTransactionId`, and moves on the version it read — a run cut short and run again
 * never counts a line twice. Then the journal cursor moves. The invariant check recomputes each snapshot from the
 * journal (up to its `asOf`) and reports any difference.
 */
import { AccountRecord } from './models/account.model.js';
import { BalanceSnapshotRecord, JOURNAL_CURSOR } from './models/balance-snapshot.model.js';
import { TransactionRecord } from './models/transaction.model.js';
import { balanceOf } from './domain/accounts.js';
import { b2bMongoose } from '../../core/db/connection.js';
import { systemScope } from '../../core/db/tenant-plugin.js';

export const ROLLUP_EVERY_MS = 60_000;
const BATCH = 1000;
const BOOKS = systemScope('wallet: balances', { routine: true });

/**
 * One account's increment from a batch: lines in entries newer than the snapshot it read.
 * @param {{ _id: unknown, lines: { accountId: string, debitPaise: number, creditPaise: number }[] }[]} batch
 * @param {string} accountId
 * @param {string} after
 */
function incrementOf(batch, accountId, after) {
  let debit = 0;
  let credit = 0;
  for (const t of batch) {
    if (String(t._id) <= after) continue;
    for (const l of t.lines) if (l.accountId === accountId) ((debit += l.debitPaise), (credit += l.creditPaise));
  }
  return { debit, credit };
}

/**
 * Reads the next batch of the journal into the snapshots. Returns how many entries were read.
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 */
export async function rollUpBalances(deps) {
  const cursor = await BalanceSnapshotRecord.findOne({ accountId: JOURNAL_CURSOR }).lean();
  const from = cursor?.asOfTransactionId ?? '';
  const batch = await TransactionRecord.find(from ? { _id: { $gt: from } } : {}, { lines: 1 })
    .sort({ _id: 1 })
    .limit(BATCH)
    .lean();
  if (batch.length === 0) return 0;
  const last = String(batch[batch.length - 1]?._id);
  const at = deps.clock.now();
  const touched = [...new Set(batch.flatMap((t) => t.lines.map((l) => l.accountId)))];
  for (const accountId of touched) {
    const snap = await BalanceSnapshotRecord.findOne({ accountId }).lean();
    const after = snap?.asOfTransactionId ?? '';
    if (after >= last) continue; // already counted (a run that was cut short)
    const inc = incrementOf(batch, accountId, after);
    await BalanceSnapshotRecord.updateOne(
      { accountId, asOfTransactionId: snap ? after : { $exists: false } },
      { $inc: { debitPaise: inc.debit, creditPaise: inc.credit }, $set: { asOfTransactionId: last, at } },
      { upsert: !snap },
    ).catch((error) => {
      if (/** @type {any} */ (error)?.code !== 11000) throw error; // another runner created it first — next run continues
    });
  }
  await BalanceSnapshotRecord.updateOne({ accountId: JOURNAL_CURSOR }, { $set: { asOfTransactionId: last, at } }, { upsert: true });
  return batch.length;
}

/** Balances of accounts (snapshots, on each account's normal side) — for the admin account explorer. @param {string[]} [accountIds] */
export async function balancesOf(accountIds) {
  const accounts = await AccountRecord.find(accountIds ? { _id: { $in: accountIds } } : {})
    .setOptions(BOOKS)
    .lean();
  const snaps = await BalanceSnapshotRecord.find({ accountId: { $in: accounts.map((a) => String(a._id)) } }).lean();
  const byId = new Map(snaps.map((s) => [s.accountId, s]));
  return accounts.map((a) => {
    const s = byId.get(String(a._id));
    return {
      id: String(a._id),
      ownerType: a.ownerType,
      ownerOrgId: a.ownerOrgId,
      type: a.type,
      name: a.name,
      normal: a.normal,
      status: a.status,
      debitPaise: s?.debitPaise ?? 0,
      creditPaise: s?.creditPaise ?? 0,
      balancePaise: balanceOf(a.normal, s?.debitPaise ?? 0, s?.creditPaise ?? 0),
      asOf: s?.at ?? null,
    };
  });
}

/** Invariant: every snapshot equals the sum of its account's journal lines up to its `asOf`. */
export function ledgerInvariants() {
  return [
    {
      name: 'ledger-snapshots-match-journal',
      check: async () => {
        const snaps = await BalanceSnapshotRecord.find({ accountId: { $ne: JOURNAL_CURSOR } })
          .limit(5000)
          .lean();
        const out = [];
        for (const s of snaps) {
          const [sum] = await TransactionRecord.aggregate([
            { $match: { 'lines.accountId': s.accountId, _id: { $lte: new b2bMongoose.Types.ObjectId(s.asOfTransactionId) } } }, // aggregate filters are not cast
            { $unwind: '$lines' },
            { $match: { 'lines.accountId': s.accountId } },
            { $group: { _id: null, d: { $sum: '$lines.debitPaise' }, c: { $sum: '$lines.creditPaise' } } },
          ]);
          if ((sum?.d ?? 0) !== s.debitPaise || (sum?.c ?? 0) !== s.creditPaise)
            out.push({ id: s.accountId, detail: `snapshot ${s.debitPaise} / ${s.creditPaise}, journal ${sum?.d ?? 0} / ${sum?.c ?? 0}` });
        }
        return out;
      },
    },
  ];
}
