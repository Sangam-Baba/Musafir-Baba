// @ts-check
/**
 * Money holds (plan Stage 11 §3.2–3.3, P1–P5 of `01-…` §8 — no transactions). Each step is one conditional update:
 * - hold:    hold PLACING → wallet `heldPaise` + op `hold:<id>` only if available ≥ amount → HELD (else FAILED);
 * - capture: HELD → CAPTURING (amount ≤ held + journal stored) → wallet: held − hold, balance − amount, op becomes
 *            CAPTURE → journal posted once, op finished → CAPTURED (anything not taken is free again);
 * - release: HELD → RELEASING → wallet: held − hold, op removed → RELEASED (or EXPIRED by the sweeper).
 * The reconciler finishes middle statuses older than 60 s, and frees HOLD ops whose hold is no longer holding.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { availableOf, canTake } from './domain/live.js';
import { assertNotOverdue, finishOp, OP_STUCK_MS, trackCredit, walletOf } from './live.service.js';
import { AccountRecord } from './models/account.model.js';
import { WalletHoldRecord } from './models/hold.model.js';

const SCOPE = systemScope('wallet: money holds', { routine: true });
const HOLDING = ['PLACING', 'HELD', 'CAPTURING', 'RELEASING'];

/** @typedef {import('./live.service.js').LiveDeps} LiveDeps */
/** @typedef {import('./live.service.js').JournalSpec} JournalSpec */

/** @param {Record<string, any>} h */
export const holdDto = (h) => ({
  id: String(h._id),
  key: h.key,
  clientOrgId: h.clientOrgId,
  amountPaise: h.amountPaise,
  status: h.status,
  expiresAt: h.expiresAt,
  capturedPaise: h.status === 'CAPTURED' ? (h.capture?.amountPaise ?? 0) : 0,
});

/** @param {Record<string, any>} h */
const opOf = (h) => `hold:${String(h._id)}`;
/** @param {unknown} id */
const load = async (id) => /** @type {Record<string, any> | null} */ (await WalletHoldRecord.findById(id).setOptions(SCOPE).lean());

/** One status step, only from `from`. @param {LiveDeps} deps @param {Record<string, any>} h @param {[string, string]} move from → to @param {Record<string, unknown>} [set] */
async function step(deps, h, [from, to], set = {}) {
  const res = await WalletHoldRecord.updateOne(
    { _id: h._id, status: from },
    { $set: { status: to, statusAt: deps.clock.now(), ...set } },
  ).setOptions(SCOPE);
  return res.modifiedCount === 1;
}

/** @param {string} accountId @param {string} opId @param {string} type */
const hasOp = async (accountId, opId, type) =>
  Boolean(await AccountRecord.exists({ _id: accountId, ops: { $elemMatch: { opId, type } } }).setOptions(SCOPE));

/** PLACING → HELD | FAILED. @param {LiveDeps} deps @param {Record<string, any>} h */
async function place(deps, h) {
  const opId = opOf(h);
  const res = await AccountRecord.updateOne(
    { _id: h.accountId, status: 'ACTIVE', 'ops.opId': { $ne: opId }, $expr: canTake(h.amountPaise) },
    {
      $inc: { heldPaise: h.amountPaise, version: 1 },
      $push: { ops: { opId, type: 'HOLD', amountPaise: h.amountPaise, holdId: String(h._id), at: deps.clock.now() } },
    },
  ).setOptions(SCOPE);
  const placed = res.modifiedCount === 1 || (await hasOp(h.accountId, opId, 'HOLD'));
  await step(deps, h, ['PLACING', placed ? 'HELD' : 'FAILED']);
  if (placed) await trackCredit(deps, h.accountId); // holding money can bring it below the low-balance line
  return /** @type {Record<string, any>} */ (await load(h._id)); // a HOLD op left by a hold the reconciler failed is freed by it
}

/**
 * Set money aside (repeat-safe by `key`; a FAILED hold is tried again).
 * @param {LiveDeps} deps
 * @param {{ clientOrgId: string, key: string, amountPaise: number, ttlMs: number, by: string }} a
 */
async function hold(deps, a) {
  if (!Number.isSafeInteger(a.amountPaise) || a.amountPaise <= 0) throw new DomainError('AMOUNT_INVALID');
  const w = await walletOf(a.clientOrgId);
  if (w.status !== 'ACTIVE') throw new ConflictError('WALLET_NOT_ACTIVE');
  const now = deps.clock.now();
  const doc = {
    key: a.key,
    clientOrgId: a.clientOrgId,
    accountId: String(w._id),
    amountPaise: a.amountPaise,
    status: 'PLACING',
    statusAt: now,
    expiresAt: new Date(now.getTime() + a.ttlMs),
    createdBy: a.by,
  };
  await WalletHoldRecord.updateOne({ key: a.key }, { $setOnInsert: doc }, { upsert: true }).setOptions(SCOPE);
  let h = /** @type {Record<string, any>} */ (await WalletHoldRecord.findOne({ key: a.key }).setOptions(SCOPE).lean());
  if (h.amountPaise !== a.amountPaise || h.clientOrgId !== a.clientOrgId) throw new ConflictError('HOLD_KEY_REUSED');
  if (h.status === 'FAILED' && (await step(deps, h, ['FAILED', 'PLACING'], { expiresAt: doc.expiresAt }))) h = { ...h, status: 'PLACING' };
  if (h.status === 'PLACING') {
    try {
      assertNotOverdue(w, now);
    } catch (error) {
      await step(deps, h, ['PLACING', 'FAILED']);
      throw error;
    }
    h = await place(deps, h);
  }
  if (h.status === 'FAILED')
    throw new ConflictError('INSUFFICIENT_WALLET_BALANCE', {
      availablePaise: availableOf(/** @type {any} */ (await walletOf(a.clientOrgId))),
    });
  return holdDto(h);
}

/** CAPTURING → CAPTURED: wallet step, journal once, done. @param {LiveDeps} deps @param {Record<string, any>} h @param {string} by */
async function finishCapture(deps, h, by) {
  const opId = opOf(h);
  const cap = h.capture;
  await AccountRecord.updateOne(
    { _id: h.accountId, ops: { $elemMatch: { opId, type: 'HOLD' } } },
    {
      $inc: { heldPaise: -h.amountPaise, balancePaise: -cap.amountPaise, version: 1 },
      $set: { 'ops.$.type': 'CAPTURE', 'ops.$.amountPaise': -cap.amountPaise, 'ops.$.journal': cap.journal, 'ops.$.at': deps.clock.now() },
    },
  ).setOptions(SCOPE);
  const a = /** @type {Record<string, any>} */ (await AccountRecord.findById(h.accountId).setOptions(SCOPE).lean());
  const op = (a.ops ?? []).find((/** @type {any} */ o) => o.opId === opId);
  if (op?.type === 'CAPTURE') await finishOp(deps, a, op, by);
  else if (!(a.doneOps ?? []).includes(opId)) throw new DomainError('HOLD_OP_MISSING', { holdId: String(h._id) });
  await step(deps, h, ['CAPTURING', 'CAPTURED']);
  await trackCredit(deps, h.accountId);
}

/**
 * Take money that was held (≤ the hold; the rest is freed) and post its journal entry. Repeat-safe.
 * @param {LiveDeps} deps
 * @param {string} holdId
 * @param {{ amountPaise: number, journal: JournalSpec, by: string }} a
 */
async function capture(deps, holdId, a) {
  let h = await load(holdId);
  if (!h) throw new NotFoundError('HOLD_NOT_FOUND');
  if (h.status === 'CAPTURED') return holdDto(h);
  if (!Number.isSafeInteger(a.amountPaise) || a.amountPaise <= 0) throw new DomainError('AMOUNT_INVALID');
  if (a.amountPaise > h.amountPaise) throw new ConflictError('CAPTURE_EXCEEDS_HOLD', { heldPaise: h.amountPaise });
  if (h.status === 'HELD') {
    await step(deps, h, ['HELD', 'CAPTURING'], { capture: { amountPaise: a.amountPaise, journal: a.journal } });
    h = /** @type {Record<string, any>} */ (await load(holdId)); // a racing capture may have stored its own amount first
  }
  if (h.status === 'CAPTURED') return holdDto(h);
  if (h.status !== 'CAPTURING') throw new ConflictError('HOLD_NOT_HELD', { holdStatus: h.status });
  await finishCapture(deps, h, a.by);
  return holdDto(/** @type {Record<string, any>} */ (await load(holdId)));
}

/** RELEASING → RELEASED | EXPIRED. @param {LiveDeps} deps @param {Record<string, any>} h */
async function finishRelease(deps, h) {
  const opId = opOf(h);
  await AccountRecord.updateOne(
    { _id: h.accountId, ops: { $elemMatch: { opId, type: 'HOLD' } } },
    { $inc: { heldPaise: -h.amountPaise, version: 1 }, $pull: { ops: { opId } } },
  ).setOptions(SCOPE);
  await step(deps, h, ['RELEASING', h.releaseAs ?? 'RELEASED']);
  await trackCredit(deps, h.accountId);
}

/** Free a hold (repeat-safe). @param {LiveDeps} deps @param {string} holdId @param {'RELEASED' | 'EXPIRED'} [as] */
async function release(deps, holdId, as = 'RELEASED') {
  let h = await load(holdId);
  if (!h) throw new NotFoundError('HOLD_NOT_FOUND');
  if (h.status === 'HELD' && (await step(deps, h, ['HELD', 'RELEASING'], { releaseAs: as })))
    h = { ...h, status: 'RELEASING', releaseAs: as };
  else h = /** @type {Record<string, any>} */ (await load(holdId));
  if (h.status === 'RELEASED' || h.status === 'EXPIRED' || h.status === 'FAILED') return holdDto(h);
  if (h.status !== 'RELEASING') throw new ConflictError('HOLD_NOT_HELD', { holdStatus: h.status });
  await finishRelease(deps, h);
  return holdDto(/** @type {Record<string, any>} */ (await load(holdId)));
}

/** HOLD ops older than 60 s whose hold is no longer holding (failed while being placed) → freed. @param {LiveDeps} deps */
async function freeOrphans(deps) {
  const before = new Date(deps.clock.now().getTime() - OP_STUCK_MS);
  const accounts = await AccountRecord.find({ balanceMode: 'LIVE', ops: { $elemMatch: { type: 'HOLD', at: { $lt: before } } } })
    .setOptions(SCOPE)
    .limit(200)
    .lean();
  let freed = 0;
  for (const a of accounts)
    for (const op of (a.ops ?? []).filter((o) => o.type === 'HOLD' && o.at < before)) {
      const h = op.holdId ? await load(op.holdId) : null;
      if (h && HOLDING.includes(h.status)) continue;
      const res = await AccountRecord.updateOne(
        { _id: a._id, ops: { $elemMatch: { opId: op.opId, type: 'HOLD' } } },
        { $inc: { heldPaise: -(op.amountPaise ?? 0), version: 1 }, $pull: { ops: { opId: op.opId } } },
      ).setOptions(SCOPE);
      freed += res.modifiedCount;
    }
  return freed;
}

/** @param {LiveDeps} deps */
export function createHolds(deps) {
  return {
    /** @param {Parameters<typeof hold>[1]} a */
    hold: (a) => hold(deps, a),
    /** @param {string} holdId @param {Parameters<typeof capture>[2]} a */
    capture: (holdId, a) => capture(deps, holdId, a),
    /** @param {string} holdId */
    release: (holdId) => release(deps, holdId),
    /** @param {string} id */
    byId: async (id) => {
      const h = /^[a-f0-9]{24}$/.test(id) ? await load(id) : null;
      return h ? holdDto(h) : null;
    },
    /** @param {string} key */
    byKey: async (key) => {
      const h = await WalletHoldRecord.findOne({ key }).setOptions(SCOPE).lean();
      return h ? holdDto(h) : null;
    },
    /** Holds past their time → EXPIRED. */
    async sweep() {
      const due = await WalletHoldRecord.find({ status: 'HELD', expiresAt: { $lte: deps.clock.now() } })
        .setOptions(SCOPE)
        .limit(500)
        .lean();
      for (const h of due) await release(deps, String(h._id), 'EXPIRED');
      return { expired: due.length };
    },
    /** Middle statuses older than 60 s finished; orphan HOLD ops freed. */
    async reconcile() {
      const before = new Date(deps.clock.now().getTime() - OP_STUCK_MS);
      const stuck = await WalletHoldRecord.find({ status: { $in: ['PLACING', 'CAPTURING', 'RELEASING'] }, statusAt: { $lt: before } })
        .setOptions(SCOPE)
        .limit(200)
        .lean();
      for (const h of stuck) {
        if (h.status === 'PLACING') await step(deps, h, ['PLACING', (await hasOp(h.accountId, opOf(h), 'HOLD')) ? 'HELD' : 'FAILED']);
        if (h.status === 'CAPTURING') await finishCapture(deps, h, 'system:reconciler');
        if (h.status === 'RELEASING') await finishRelease(deps, h);
      }
      return { resumed: stuck.length, freed: await freeOrphans(deps) };
    },
  };
}
