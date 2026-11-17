// @ts-check
/**
 * The single-night steps behind holds and bookings (`05-…` §5). Each is ONE atomic update of ONE night document
 * that records (or removes) the hold / booking id in that same document — so a step can never apply twice and can
 * always be undone exactly. Run by the booking engine as SYSTEM (logged scope). Never call these over HTTP, never
 * replace them with read-then-write code, never enable global `sanitizeFilter` (it breaks `$expr` / `$ne`).
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { InventoryDayRecord } from './models/inventory-day.model.js';

const SCOPE = systemScope('hotel-inventory: take / give back rooms (booking engine)', { routine: true });

/** @typedef {{ roomTypeId: string, date: string, qty: number }} NightStep */

/** Holds `qty` rooms for the hold on that night, if they are free. @param {NightStep} s @param {{ holdId: string, expiresAt: Date }} h */
export async function takeNight(s, h) {
  const res = await InventoryDayRecord.updateOne(
    {
      roomTypeId: s.roomTypeId,
      date: s.date,
      stopSell: false,
      'holds.holdId': { $ne: h.holdId }, // never the same hold twice
      $expr: { $lte: [{ $add: ['$booked', '$held', s.qty] }, '$total'] },
    },
    { $inc: { held: s.qty, version: 1 }, $push: { holds: { holdId: h.holdId, qty: s.qty, expiresAt: h.expiresAt } } },
  ).setOptions(SCOPE);
  if (res.modifiedCount === 1) return true;
  return Boolean(await InventoryDayRecord.exists({ roomTypeId: s.roomTypeId, date: s.date, 'holds.holdId': h.holdId }).setOptions(SCOPE));
}

/** Pipeline: remove one owner's entry and subtract exactly the quantity recorded with it. @param {'holds' | 'bookings'} list @param {'holdId' | 'bookingId'} key @param {string} id */
function removeOwner(list, key, id) {
  const count = list === 'holds' ? 'held' : 'booked';
  const mine = { $filter: { input: `$${list}`, cond: { $eq: [`$$this.${key}`, id] } } };
  return [
    {
      $set: {
        [count]: { $subtract: [`$${count}`, { $sum: { $map: { input: mine, in: '$$this.qty' } } }] },
        [list]: { $filter: { input: `$${list}`, cond: { $ne: [`$$this.${key}`, id] } } },
        version: { $add: ['$version', 1] },
        updatedAt: '$$NOW',
      },
    },
  ];
}

/** Gives back a hold's rooms on that night (no-op when it isn't there any more). @param {{ roomTypeId: string, date: string }} s @param {string} holdId */
export async function releaseNight(s, holdId) {
  await InventoryDayRecord.updateOne(
    { roomTypeId: s.roomTypeId, date: s.date, 'holds.holdId': holdId },
    removeOwner('holds', 'holdId', holdId),
    {
      timestamps: false,
    },
  ).setOptions(SCOPE);
}

/** Gives back a booking's rooms on that night (cancellation; no-op when already given back). @param {{ roomTypeId: string, date: string }} s @param {string} bookingId */
export async function returnNight(s, bookingId) {
  await InventoryDayRecord.updateOne(
    { roomTypeId: s.roomTypeId, date: s.date, 'bookings.bookingId': bookingId },
    removeOwner('bookings', 'bookingId', bookingId),
    {
      timestamps: false,
    },
  ).setOptions(SCOPE);
}

/**
 * Turns the hold's rooms on that night into the booking's. Returns 'DONE' (now or earlier) or 'LOST'
 * (the hold isn't there — e.g. expired and swept — and the rooms couldn't be taken again).
 * @param {NightStep} s @param {{ holdId: string, bookingId: string }} ids
 * @returns {Promise<'DONE' | 'LOST'>}
 */
export async function confirmNight(s, ids) {
  const res = await InventoryDayRecord.updateOne(
    { roomTypeId: s.roomTypeId, date: s.date, 'holds.holdId': ids.holdId, 'bookings.bookingId': { $ne: ids.bookingId } },
    {
      $inc: { held: -s.qty, booked: s.qty, version: 1 },
      $pull: { holds: { holdId: ids.holdId } },
      $push: { bookings: { bookingId: ids.bookingId, qty: s.qty } },
    },
  ).setOptions(SCOPE);
  if (res.modifiedCount === 1) return 'DONE';
  if (await InventoryDayRecord.exists({ roomTypeId: s.roomTypeId, date: s.date, 'bookings.bookingId': ids.bookingId }).setOptions(SCOPE))
    return 'DONE';
  // the hold was lost (expired and swept): one attempt to take the rooms again for the booking (`05-…` §5.2)
  const again = await InventoryDayRecord.updateOne(
    {
      roomTypeId: s.roomTypeId,
      date: s.date,
      stopSell: false,
      'bookings.bookingId': { $ne: ids.bookingId },
      $expr: { $lte: [{ $add: ['$booked', '$held', s.qty] }, '$total'] },
    },
    { $inc: { booked: s.qty, version: 1 }, $push: { bookings: { bookingId: ids.bookingId, qty: s.qty } } },
  ).setOptions(SCOPE);
  return again.modifiedCount === 1 ? 'DONE' : 'LOST';
}

/** The new expiry on every night entry of an extended hold (so the orphan sweep reads the right time). @param {string} holdId @param {Date} expiresAt */
export async function extendNights(holdId, expiresAt) {
  await InventoryDayRecord.updateMany({ 'holds.holdId': holdId }, { $set: { 'holds.$.expiresAt': expiresAt } }).setOptions(SCOPE);
}

/** A line's nights in the fixed order every process uses (room type, then date). @param {{ roomTypeId: string, qty: number, dates: string[] }[]} lines */
export function stepsOf(lines) {
  return lines
    .flatMap((l) => l.dates.map((date) => ({ roomTypeId: l.roomTypeId, date, qty: l.qty })))
    .sort((a, b) => (a.roomTypeId === b.roomTypeId ? a.date.localeCompare(b.date) : a.roomTypeId.localeCompare(b.roomTypeId)));
}
