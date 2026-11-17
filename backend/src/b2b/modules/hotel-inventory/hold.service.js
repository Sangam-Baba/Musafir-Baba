// @ts-check
/**
 * Inventory primitives for the booking engine (`05-…` §5, plan Stage 04 §3.9). SYSTEM actor only, no HTTP, every
 * call repeat-safe, no transactions:
 * - `holdRooms`: hold document PLACING → per night take (records the hold id) → ACTIVE; a sold-out night gives
 *   back the nights already taken and the hold FAILS (`SOLD_OUT`, with the night);
 * - `confirmHold`: ACTIVE → CONFIRMING (the sweeper can no longer release it) → per night held → booked → CONFIRMED;
 *   a night truly lost → the booking's nights are given back, hold FAILED (`NIGHT_LOST`) — the caller refunds;
 * - `releaseHold`: PLACING / ACTIVE → RELEASING → per night give back → RELEASED (no-op otherwise);
 * - `extendHold`: +10 minutes, once, only while ACTIVE;
 * - `returnRooms`: a cancelled booking's rooms back, per night, by booking id.
 * A crash between steps leaves a status the reconciler (S04-T09) finishes or undoes.
 */
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { isDate } from './domain/dates.js';
import { HoldRecord } from './models/hold.model.js';
import { confirmNight, extendNights, releaseNight, returnNight, stepsOf, takeNight } from './night-steps.js';

export const HOLD_MINUTES = 15;
export const EXTEND_MINUTES = 10;
const SCOPE = systemScope('hotel-inventory: hold state (booking engine)', { routine: true });
const MIN = 60_000;

/** @typedef {import('../../core/context.js').RequestContext} Ctx */
/** @typedef {{ roomTypeId: string, qty: number, dates: string[] }} HoldLine */

/** @param {Ctx} ctx */
function assertSystem(ctx) {
  if (ctx.actor.type !== 'system') throw new ForbiddenError('INVENTORY_SYSTEM_ONLY');
}

/** @param {HoldLine[]} lines */
function checkLines(lines) {
  const ok =
    lines.length > 0 &&
    lines.every(
      (l) =>
        Number.isInteger(l.qty) &&
        l.qty >= 1 &&
        l.qty <= 9 &&
        l.dates.length > 0 &&
        l.dates.every(isDate) &&
        new Set(l.dates).size === l.dates.length,
    );
  if (!ok) throw new DomainError('HOLD_LINES_INVALID');
}

/** @param {any} h */
export const holdDto = (h) => ({
  id: String(h._id),
  orderId: h.orderId,
  propertyId: h.propertyId,
  lines: h.lines,
  status: h.status,
  expiresAt: h.expiresAt,
  extendedOnce: h.extendedOnce,
  bookingId: h.bookingId,
  failure: h.failure,
});

/** Conditional status change. @param {string} id @param {string | string[]} from @param {Record<string, unknown>} set @param {Date} now */
async function move(id, from, set, now) {
  const res = await HoldRecord.updateOne(
    { _id: id, status: Array.isArray(from) ? { $in: from } : from },
    { $set: { ...set, statusAt: now } },
  ).setOptions(SCOPE);
  return res.modifiedCount === 1;
}

/** Gives back every night of a hold (by hold id — only where it is still recorded). @param {any} hold */
async function giveBackAll(hold) {
  for (const s of stepsOf(hold.lines)) await releaseNight(s, String(hold._id));
}

/** @param {any} hold */
async function giveBackBooking(hold) {
  for (const s of stepsOf(hold.lines)) await returnNight(s, hold.bookingId);
}

/** An existing hold for the order (repeat call). @param {any} h */
function repeatResult(h) {
  if (h.status === 'FAILED' && h.failure?.code === 'SOLD_OUT') throw new ConflictError('SOLD_OUT', h.failure);
  if (h.status === 'PLACING') throw new ConflictError('HOLD_IN_PROGRESS');
  return holdDto(h);
}

/** @typedef {{ clock: import('../../core/clock.js').Clock }} HoldDeps */

/** @param {string} id */
async function load(id) {
  const h = /^[a-f0-9]{24}$/.test(id) ? await HoldRecord.findOne({ _id: id }).setOptions(SCOPE).lean() : null;
  if (!h) throw new NotFoundError('HOLD_NOT_FOUND');
  return /** @type {any} */ (h);
}

/** @param {HoldDeps} deps @param {{ orderId: string, hotelOrgId: string, propertyId: string, lines: HoldLine[] }} req */
async function holdRooms(deps, req) {
  checkLines(req.lines);
  const existing = await HoldRecord.findOne({ orderId: req.orderId }).setOptions(SCOPE).lean();
  if (existing) return repeatResult(existing);
  const at = deps.clock.now();
  const hold = await HoldRecord.create({
    ...req,
    status: 'PLACING',
    statusAt: at,
    expiresAt: new Date(at.getTime() + HOLD_MINUTES * MIN),
  }).catch((e) => {
    if (e?.code === 11000) throw new ConflictError('HOLD_IN_PROGRESS');
    throw e;
  });
  const id = String(hold._id);
  for (const step of stepsOf(req.lines)) {
    if (await takeNight(step, { holdId: id, expiresAt: hold.expiresAt })) continue;
    await giveBackAll(hold);
    const failure = { code: 'SOLD_OUT', roomTypeId: step.roomTypeId, date: step.date };
    await move(id, 'PLACING', { status: 'FAILED', failure }, deps.clock.now());
    throw new ConflictError('SOLD_OUT', failure);
  }
  if (!(await move(id, 'PLACING', { status: 'ACTIVE' }, deps.clock.now()))) {
    await giveBackAll(hold); // the reconciler gave up on it meanwhile
    throw new ConflictError('HOLD_LOST');
  }
  return holdDto(await load(id));
}

/** Steps 2–3 of confirming (also used by the reconciler to finish forward). @param {HoldDeps} deps @param {any} h */
async function finishConfirm(deps, h) {
  const lost = [];
  for (const s of stepsOf(h.lines))
    if ((await confirmNight(s, { holdId: String(h._id), bookingId: h.bookingId })) === 'LOST')
      lost.push({ roomTypeId: s.roomTypeId, date: s.date });
  if (lost.length > 0) {
    await giveBackBooking(h);
    await giveBackAll(h);
    await move(String(h._id), 'CONFIRMING', { status: 'FAILED', failure: { code: 'NIGHT_LOST', nights: lost } }, deps.clock.now());
    throw new ConflictError('NIGHT_LOST', { nights: lost });
  }
  await move(String(h._id), 'CONFIRMING', { status: 'CONFIRMED' }, deps.clock.now());
  return holdDto(await load(String(h._id)));
}

/** @param {HoldDeps} deps @param {{ holdId: string, bookingId: string }} req */
async function confirmHold(deps, req) {
  const h = await load(req.holdId);
  if (h.status === 'CONFIRMED' && h.bookingId === req.bookingId) return holdDto(h);
  const claimed =
    (await move(req.holdId, 'ACTIVE', { status: 'CONFIRMING', bookingId: req.bookingId }, deps.clock.now())) ||
    (h.status === 'CONFIRMING' && h.bookingId === req.bookingId);
  if (!claimed) throw new ConflictError('HOLD_NOT_ACTIVE', { status: h.status });
  return finishConfirm(deps, { ...h, bookingId: req.bookingId });
}

/** @param {HoldDeps} deps @param {string} holdId */
async function releaseHold(deps, holdId) {
  const h = await load(holdId);
  const started = (await move(holdId, ['PLACING', 'ACTIVE'], { status: 'RELEASING' }, deps.clock.now())) || h.status === 'RELEASING';
  if (!started) return { released: false, status: h.status };
  await giveBackAll(h);
  await move(holdId, 'RELEASING', { status: 'RELEASED' }, deps.clock.now());
  return { released: true, status: 'RELEASED' };
}

/** @param {string} holdId */
async function extendHold(holdId) {
  const h = await load(holdId);
  const expiresAt = new Date(new Date(h.expiresAt).getTime() + EXTEND_MINUTES * MIN);
  const res = await HoldRecord.updateOne(
    { _id: holdId, status: 'ACTIVE', extendedOnce: false },
    { $set: { expiresAt, extendedOnce: true } },
  ).setOptions(SCOPE);
  if (res.modifiedCount !== 1) throw new ConflictError('HOLD_NOT_EXTENDABLE', { status: h.status, extendedOnce: h.extendedOnce });
  await extendNights(holdId, expiresAt);
  return holdDto(await load(holdId));
}

/** @param {{ bookingId: string, lines: HoldLine[] }} req */
async function returnRooms(req) {
  checkLines(req.lines);
  for (const s of stepsOf(req.lines)) await returnNight(s, req.bookingId);
  return { returned: true };
}

/** @param {HoldDeps} deps */
export function createHoldService(deps) {
  return {
    /** @param {Ctx} ctx @param {Parameters<typeof holdRooms>[1]} req */
    holdRooms: async (ctx, req) => (assertSystem(ctx), holdRooms(deps, req)),
    /** @param {Ctx} ctx @param {{ holdId: string, bookingId: string }} req */
    confirmHold: async (ctx, req) => (assertSystem(ctx), confirmHold(deps, req)),
    /** @param {Ctx} ctx @param {any} hold */
    finishConfirm: async (ctx, hold) => (assertSystem(ctx), finishConfirm(deps, hold)),
    /** @param {Ctx} ctx @param {string} holdId */
    releaseHold: async (ctx, holdId) => (assertSystem(ctx), releaseHold(deps, holdId)),
    /** @param {Ctx} ctx @param {string} holdId */
    extendHold: async (ctx, holdId) => (assertSystem(ctx), extendHold(holdId)),
    /** A cancelled booking's rooms back (repeat-safe). @param {Ctx} ctx @param {{ bookingId: string, lines: HoldLine[] }} req */
    returnRooms: async (ctx, req) => (assertSystem(ctx), returnRooms(req)),
  };
}
