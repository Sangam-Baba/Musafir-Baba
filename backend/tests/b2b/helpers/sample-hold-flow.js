// @ts-check
/**
 * A test-only miniature of the real inventory flow (docs/plan/05-… §5) built from the
 * consistency kit, used to prove the kit is crash-safe and race-safe on a STANDALONE MongoDB.
 * The real hotel-inventory module (Stage 04) follows the same shape.
 */
import { b2bMongoose } from '../../../src/b2b/core/db/connection.js';
import { createMigrationContext } from '../../../src/b2b/core/db/migrations.js';
import { defineTenantModel } from '../../../src/b2b/core/db/model.js';
import { applyOwned, transferOwned, undoOwned } from '../../../src/b2b/core/db/owned-counter.js';
import { systemScope } from '../../../src/b2b/core/db/tenant-plugin.js';
import { stateFields, transition } from '../../../src/b2b/core/db/transition.js';
import { createReconciler } from '../../../src/b2b/core/jobs/reconciler.js';

const m = b2bMongoose;
export const HELD = { counter: 'held', list: 'holds' };
export const BOOKED = { counter: 'booked', list: 'bookings' };
export const SYS = systemScope('test-booking-engine');

export const Night = defineTenantModel('ProbeNight', new m.Schema({
  hotelOrgId: String, roomTypeId: String, date: String, total: Number, held: Number, booked: Number, version: Number,
  holds: [{ _id: false, ownerId: String, qty: Number }], bookings: [{ _id: false, ownerId: String, qty: Number }],
}), 'inv_probe_nights', ['hotelOrgId']);

const HOLD_STATUSES = ['PLACING', 'ACTIVE', 'CONFIRMING', 'CONFIRMED', 'FAILED'];
export const Hold = defineTenantModel('ProbeHold', new m.Schema({
  _id: String, hotelOrgId: String, roomTypeId: String, dates: [String], qty: Number, bookingId: String,
  ...stateFields(m, HOLD_STATUSES),
}), 'inv_probe_holds', ['hotelOrgId']);

/**
 * Collection validator — the database's own last line of defence (05-… §3).
 * @param {import('mongodb').Db} db
 */
export async function createCollections(db) {
  const ctx = createMigrationContext(db);
  await ctx.createCollection('inv_probe_nights', {
    validator: { $and: [
      { $expr: { $lte: [{ $add: ['$held', '$booked'] }, '$total'] } },
      { held: { $gte: 0 } }, { booked: { $gte: 0 } },
      { $expr: { $eq: ['$held', { $sum: '$holds.qty' }] } },
      { $expr: { $eq: ['$booked', { $sum: '$bookings.qty' }] } },
    ] },
  });
  await ctx.createCollection('inv_probe_holds');
}

/** @param {string} hotelOrgId @param {string} roomTypeId @param {string[]} dates @param {number} total */
export async function seedNights(hotelOrgId, roomTypeId, dates, total) {
  await Night.insertMany(dates.map((date) => ({ hotelOrgId, roomTypeId, date, total, held: 0, booked: 0, holds: [], bookings: [] })));
}

/** @param {{ id: string, hotelOrgId: string, roomTypeId: string, dates: string[], qty: number }} h @param {import('../../../src/b2b/core/clock.js').Clock} clock */
export function holdSteps(h, clock) {
  const night = (/** @type {string} */ date) => ({ hotelOrgId: h.hotelOrgId, roomTypeId: h.roomTypeId, date });
  return [
    async () => { await Hold.create({ _id: h.id, hotelOrgId: h.hotelOrgId, roomTypeId: h.roomTypeId, dates: h.dates, qty: h.qty, status: 'PLACING', statusChangedAt: clock.now() }); },
    ...h.dates.map((date) => async () => {
      const { filter, update } = applyOwned(HELD, h.id, h.qty, { capacity: { total: 'total', others: ['booked'] } });
      const res = await Night.updateOne({ ...night(date), ...filter }, update);
      if (res.modifiedCount === 1) return;
      const already = await Night.countDocuments({ ...night(date), 'holds.ownerId': h.id });
      if (already === 0) throw Object.assign(new Error('SOLD_OUT'), { code: 'SOLD_OUT' });
    }),
    async () => { await transition(Hold, { id: h.id, scope: { hotelOrgId: h.hotelOrgId }, from: 'PLACING', to: 'ACTIVE', clock }); },
  ];
}

/** Give back every night of a hold (idempotent), then mark it FAILED. */
export async function failHold(/** @type {Record<string, any>} */ hold, /** @type {import('../../../src/b2b/core/clock.js').Clock} */ clock) {
  for (const date of hold.dates) {
    const { filter, update } = undoOwned(HELD, hold._id);
    await Night.updateOne({ hotelOrgId: hold.hotelOrgId, roomTypeId: hold.roomTypeId, date, ...filter }, update);
  }
  await transition(Hold, { id: hold._id, scope: { hotelOrgId: hold.hotelOrgId }, from: 'PLACING', to: 'FAILED', clock });
}

/** Full hold attempt: run the steps; on SOLD_OUT give back what was taken. */
export async function placeHold(/** @type {Parameters<typeof holdSteps>[0]} */ h, /** @type {import('../../../src/b2b/core/clock.js').Clock} */ clock) {
  try {
    for (const step of holdSteps(h, clock)) await step();
    return 'ACTIVE';
  } catch (error) {
    if (/** @type {any} */ (error).code !== 'SOLD_OUT') throw error;
    const hold = await Hold.findOne({ _id: h.id, hotelOrgId: h.hotelOrgId }).lean();
    await failHold(/** @type {any} */ (hold), clock);
    return 'FAILED';
  }
}

/** @param {{ id: string, hotelOrgId: string, roomTypeId: string, dates: string[] }} h @param {string} bookingId @param {import('../../../src/b2b/core/clock.js').Clock} clock */
export function confirmSteps(h, bookingId, clock) {
  return [
    async () => { await transition(Hold, { id: h.id, scope: { hotelOrgId: h.hotelOrgId }, from: 'ACTIVE', to: 'CONFIRMING', set: { bookingId }, clock }); },
    ...h.dates.map((date) => async () => {
      const { filter, update } = transferOwned(HELD, BOOKED, h.id, bookingId);
      await Night.updateOne({ hotelOrgId: h.hotelOrgId, roomTypeId: h.roomTypeId, date, ...filter }, update);
    }),
    async () => { await transition(Hold, { id: h.id, scope: { hotelOrgId: h.hotelOrgId }, from: 'CONFIRMING', to: 'CONFIRMED', clock }); },
  ];
}

/** Reconciler with the two rules the real module will have. */
export function sampleReconciler() {
  const reconciler = createReconciler();
  reconciler.register({
    name: 'probe-hold-placing', model: Hold, stuckStatus: 'PLACING', olderThanMs: 30_000,
    resume: (doc, { clock }) => failHold(doc, clock),
  });
  reconciler.register({
    name: 'probe-hold-confirming', model: Hold, stuckStatus: 'CONFIRMING', olderThanMs: 30_000,
    resume: async (doc, { clock }) => {
      for (const step of confirmSteps(/** @type {any} */ ({ ...doc, id: doc._id }), doc.bookingId, clock).slice(1)) await step();
    },
  });
  return reconciler;
}
