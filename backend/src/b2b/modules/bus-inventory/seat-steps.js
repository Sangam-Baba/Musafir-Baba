// @ts-check
/**
 * The only code that changes a trip seat's `taken` mask (plan Stage 18 §5). Each step is ONE conditional update:
 *   take    — only if none of the wanted legs is taken (`$bitsAllClear`), the claim isn't already on the seat, and (for
 *             a ladies-only seat) the claim may use it → set the legs (`$bit or`) and push the entry in the same update;
 *   give back — only while the claim's entry (same mask) is on the seat → clear its legs (`$bit and ~mask`) and pull it;
 *   confirm — a hold's entries become BOOKING.
 * `modifiedCount === 1` or nothing happened. No read-then-write decides who wins, no transactions.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { TripSeatRecord } from './models/trip-seat.model.js';

const SCOPE = systemScope('bus-inventory: seat steps', { routine: true });

/** @typedef {{ tripId: string, ref: string, kind: 'HOLD' | 'BLOCK', mask: number, at: Date }} Claim */

/**
 * Take one seat for a claim. Ladies-only seats are taken only when `ladiesOk` lists the seat.
 * @param {Claim} c @param {string} no @param {boolean} ladiesOk
 */
export async function takeSeat(c, no, ladiesOk) {
  const res = await TripSeatRecord.updateOne(
    {
      tripId: c.tripId,
      no,
      taken: { $bitsAllClear: c.mask },
      'entries.ref': { $ne: c.ref },
      ...(ladiesOk ? {} : { ladies: { $ne: true } }),
    },
    { $bit: { taken: { or: c.mask } }, $push: { entries: { kind: c.kind, ref: c.ref, mask: c.mask, at: c.at } } },
  ).setOptions(SCOPE);
  return res.modifiedCount === 1;
}

/** Give one seat back (repeat-safe: false when the claim isn't on it). @param {string} tripId @param {string} no @param {string} ref */
export async function giveBackSeat(tripId, no, ref) {
  const seat = await TripSeatRecord.findOne({ tripId, no, 'entries.ref': ref }, { entries: 1 }).setOptions(SCOPE).lean();
  const entry = seat?.entries.find((e) => e.ref === ref);
  if (!entry) return false;
  const mask = Number(entry.mask);
  const res = await TripSeatRecord.updateOne(
    { tripId, no, entries: { $elemMatch: { ref, mask } } },
    { $bit: { taken: { and: ~mask } }, $pull: { entries: { ref } } },
  ).setOptions(SCOPE);
  return res.modifiedCount === 1;
}

/**
 * Take several seats one by one; if one can't be taken, give back the ones already taken (all or nothing).
 * @param {Claim} c @param {string[]} seats @param {string[]} ladiesOk
 * @returns {Promise<{ ok: true } | { ok: false, seat: string }>}
 */
export async function takeSeats(c, seats, ladiesOk) {
  const taken = [];
  for (const no of seats) {
    if (!(await takeSeat(c, no, ladiesOk.includes(no)))) {
      for (const back of taken) await giveBackSeat(c.tripId, back, c.ref);
      return { ok: false, seat: no };
    }
    taken.push(no);
  }
  return { ok: true };
}

/** Give back every seat of a claim (repeat-safe). @param {string} tripId @param {string[]} seats @param {string} ref */
export async function giveBackSeats(tripId, seats, ref) {
  for (const no of seats) await giveBackSeat(tripId, no, ref);
}

/** A hold's seat entries become BOOKING (repeat-safe). @param {string} tripId @param {string} ref */
export async function confirmSeats(tripId, ref) {
  await TripSeatRecord.updateMany(
    { tripId, entries: { $elemMatch: { ref, kind: 'HOLD' } } },
    { $set: { 'entries.$[e].kind': 'BOOKING' } },
    { arrayFilters: [{ 'e.ref': ref }] },
  ).setOptions(SCOPE);
}
