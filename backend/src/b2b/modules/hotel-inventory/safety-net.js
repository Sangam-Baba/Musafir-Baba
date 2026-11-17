// @ts-check
/**
 * The safety net that replaces transactions for rooms (`05-…` §5.4, plan Stage 04 §3.10):
 * - reconciler rules (every 30 s, lease-locked, alert after 3 attempts): holds stuck in PLACING (process died
 *   while taking nights → give back by hold id → FAILED), RELEASING (finish the release), CONFIRMING (finish the
 *   confirm forward — money may be captured);
 * - the hold sweeper (every 30 s): expired ACTIVE holds → released; night entries whose hold expired more than
 *   5 minutes ago and isn't being confirmed (orphans) → removed; any hold still ACTIVE 2 minutes after expiry → alert;
 * - invariant checks (every 10 min, read-only): counts match their owners and never exceed the rooms; every hold
 *   entry more than 10 minutes past its expiry belongs to a live hold (the sweeper removes leftovers after 5). (Booking entries belong to a confirmed / cancelling booking: with Stage 08.)
 */
import { systemContext } from '../../core/context.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { addDays } from './domain/dates.js';
import { createHoldService, giveBackAll, move } from './hold.service.js';
import { HoldRecord } from './models/hold.model.js';
import { InventoryDayRecord } from './models/inventory-day.model.js';
import { releaseNight } from './night-steps.js';

export const STUCK_AFTER_MS = 30_000;
export const SWEEP_EVERY_MS = 30_000;
export const ORPHAN_AFTER_MS = 5 * 60_000;
export const OVERDUE_ALERT_MS = 2 * 60_000;
const BATCH = 200;
const SCOPE = systemScope('hotel-inventory: hold sweeper / invariant checks', { routine: true });

/** @typedef {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger }} NetDeps */

/** @param {NetDeps} deps @param {string} reason */
const sysCtx = (deps, reason) => systemContext(reason, `reconcile-${deps.clock.now().getTime()}`, deps.logger, deps.clock);

/** @param {NetDeps} deps @returns {import('../../core/jobs/reconciler.js').ReconcileRule[]} */
export function holdReconcileRules(deps) {
  const holds = createHoldService({ clock: deps.clock });
  return [
    {
      name: 'inventory-hold-placing',
      model: HoldRecord,
      stuckStatus: 'PLACING',
      olderThanMs: STUCK_AFTER_MS,
      resume: async (h) => {
        await giveBackAll(h);
        await move(String(h._id), 'PLACING', { status: 'FAILED', failure: { code: 'ABANDONED' } }, { now: deps.clock.now(), changed: h });
      },
    },
    {
      name: 'inventory-hold-releasing',
      model: HoldRecord,
      stuckStatus: 'RELEASING',
      olderThanMs: STUCK_AFTER_MS,
      resume: async (h) => {
        await giveBackAll(h);
        await move(String(h._id), 'RELEASING', { status: 'RELEASED' }, { now: deps.clock.now(), changed: h });
      },
    },
    {
      name: 'inventory-hold-confirming',
      model: HoldRecord,
      stuckStatus: 'CONFIRMING',
      olderThanMs: STUCK_AFTER_MS,
      resume: async (h) => {
        await holds.finishConfirm(sysCtx(deps, 'reconciler: finish a confirm'), h).catch((e) => {
          // a truly lost night: the booking's nights were given back and the hold FAILED — the booking engine refunds
          if (e?.code !== 'NIGHT_LOST') throw e;
          deps.logger.error(
            { holdId: String(h._id), nights: e.details?.nights },
            'inventory: a confirmed checkout lost a night — refund path',
          );
        });
      },
    },
  ];
}

/** Expired ACTIVE holds → released (an extension that lands first wins: the condition re-checks the expiry). @param {NetDeps} deps */
async function releaseExpired(deps) {
  const now = deps.clock.now();
  const expired = await HoldRecord.find({ status: 'ACTIVE', expiresAt: { $lt: now } })
    .setOptions(SCOPE)
    .sort({ expiresAt: 1 })
    .limit(BATCH)
    .lean();
  let released = 0;
  for (const h of expired) {
    const claimed = await HoldRecord.updateOne(
      { _id: h._id, status: 'ACTIVE', expiresAt: { $lt: now } },
      { $set: { status: 'RELEASING', statusChangedAt: now, failure: { code: 'EXPIRED' } } },
    ).setOptions(SCOPE);
    if (claimed.modifiedCount !== 1) continue;
    await giveBackAll(h);
    if (await move(String(h._id), 'RELEASING', { status: 'RELEASED' }, { now: deps.clock.now(), changed: h })) released += 1;
  }
  return released;
}

/** Night entries of holds that ended long ago (crash leftovers). @param {NetDeps} deps */
async function removeOrphans(deps) {
  const cutoff = new Date(deps.clock.now().getTime() - ORPHAN_AFTER_MS);
  const nightsWithOld = await InventoryDayRecord.find({ 'holds.expiresAt': { $lt: cutoff } }, { roomTypeId: 1, date: 1, holds: 1 })
    .setOptions(SCOPE)
    .limit(BATCH)
    .lean();
  const ids = [...new Set(nightsWithOld.flatMap((n) => n.holds.filter((e) => e.expiresAt < cutoff).map((e) => e.holdId)))];
  const statuses = new Map(
    (
      await HoldRecord.find({ _id: { $in: ids } }, { status: 1 })
        .setOptions(SCOPE)
        .lean()
    ).map((h) => [String(h._id), h.status]),
  );
  let removed = 0;
  for (const n of nightsWithOld)
    for (const e of n.holds) {
      if (e.expiresAt >= cutoff || statuses.get(e.holdId) === 'CONFIRMING') continue;
      await releaseNight({ roomTypeId: n.roomTypeId, date: n.date }, e.holdId);
      removed += 1;
    }
  return removed;
}

/** The 30-second hold sweep. @param {NetDeps} deps */
export async function sweepHolds(deps) {
  const expired = await releaseExpired(deps);
  const orphans = await removeOrphans(deps);
  const overdue = await HoldRecord.countDocuments({
    status: 'ACTIVE',
    expiresAt: { $lt: new Date(deps.clock.now().getTime() - OVERDUE_ALERT_MS) },
  }).setOptions(SCOPE);
  if (overdue > 0) deps.logger.error({ overdue }, 'inventory: holds still active more than 2 minutes after expiry');
  if (orphans > 0) deps.logger.warn({ orphans }, 'inventory: removed hold entries left behind');
  return { expired, orphans, overdue };
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps @returns {import('../../core/db/invariants.js').Invariant[]} */
export function inventoryInvariants(deps) {
  const fromYesterday = () => ({ date: { $gte: addDays(deps.clock.now().toISOString().slice(0, 10), -1) } });
  return [
    {
      name: 'inventory-night-counts',
      check: async () => {
        const bad = await InventoryDayRecord.aggregate([
          { $match: fromYesterday() },
          {
            $match: {
              $expr: {
                $or: [
                  { $ne: ['$held', { $sum: '$holds.qty' }] },
                  { $ne: ['$booked', { $sum: '$bookings.qty' }] },
                  { $gt: [{ $add: ['$booked', '$held'] }, '$total'] },
                  { $lt: ['$held', 0] },
                  { $lt: ['$booked', 0] },
                ],
              },
            },
          },
          { $limit: 50 },
          { $project: { roomTypeId: 1, date: 1, total: 1, booked: 1, held: 1 } },
        ]).option(SCOPE);
        return bad.map((n) => ({
          id: String(n._id),
          detail: `${n.roomTypeId} ${n.date}: total ${n.total}, booked ${n.booked}, held ${n.held}`,
        }));
      },
    },
    {
      name: 'inventory-hold-entries-have-a-live-hold',
      check: async () => {
        const rows = await InventoryDayRecord.aggregate([
          { $match: { ...fromYesterday(), 'holds.0': { $exists: true } } },
          { $unwind: '$holds' },
          { $match: { 'holds.expiresAt': { $lt: new Date(deps.clock.now().getTime() - 2 * ORPHAN_AFTER_MS) } } },
          { $group: { _id: '$holds.holdId' } },
          { $limit: 5000 },
        ]).option(SCOPE);
        const ids = rows.map((r) => String(r._id));
        const live = new Set(
          (
            await HoldRecord.find(
              {
                _id: { $in: ids.filter((i) => /^[a-f0-9]{24}$/.test(i)) },
                status: { $in: ['PLACING', 'ACTIVE', 'CONFIRMING', 'RELEASING'] },
              },
              { _id: 1 },
            )
              .setOptions(SCOPE)
              .lean()
          ).map((h) => String(h._id)),
        );
        return ids.filter((i) => !live.has(i)).map((i) => ({ id: i, detail: `hold entry without a live hold: ${i}` }));
      },
    },
  ];
}
