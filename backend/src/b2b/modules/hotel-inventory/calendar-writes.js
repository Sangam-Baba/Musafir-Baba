// @ts-check
/**
 * The writes behind a calendar edit (plan Stage 04 §3.5–3.6, `05-…` §10). Each one is a conditional
 * single-document update (no transactions):
 * - rooms: `total` only goes where it stays ≥ booked + held (the database rule backs this up); the nights that
 *   couldn't change are listed with their booked / held counts;
 * - prices / rules: one upsert per night, merged inside MongoDB (a pipeline update), so prices for other numbers
 *   of guests and edits arriving at the same moment are never lost.
 */
import { RULE_FIELDS } from './domain/bulk-edit.js';
import { InventoryDayRecord } from './models/inventory-day.model.js';
import { RateDayRecord } from './models/rate-day.model.js';

/** @typedef {import('./domain/bulk-edit.js').RoomChange} RoomChange */
/** @typedef {import('./domain/bulk-edit.js').RateChange} RateChange */
/** @typedef {{ hotelOrgId: string, propertyId: string }} Owner */

const RULE_DEFAULTS = { minLos: null, maxLos: null, closedToArrival: false, closedToDeparture: false, stopSell: false };

/** Values before the change (for the log and undo). @param {Owner} o @param {string[]} dates @param {RoomChange[]} rooms @param {RateChange[]} rates */
export async function snapshot(o, dates, rooms, rates) {
  const roomTypeIds = [...new Set(rooms.map((r) => r.roomTypeId))];
  const nightDocs = roomTypeIds.length
    ? await InventoryDayRecord.find({
        hotelOrgId: o.hotelOrgId,
        propertyId: o.propertyId,
        roomTypeId: { $in: roomTypeIds },
        date: { $in: dates },
      }).lean()
    : [];
  const rateDocs = rates.length
    ? await RateDayRecord.find({
        hotelOrgId: o.hotelOrgId,
        propertyId: o.propertyId,
        ratePlanId: { $in: [...new Set(rates.map((r) => r.ratePlanId))] },
        date: { $in: dates },
      }).lean()
    : [];
  const byCell = new Map(rateDocs.map((d) => [`${d.ratePlanId}|${d.roomTypeId}|${d.date}`, d]));
  return {
    nights: nightDocs.map((n) => ({
      roomTypeId: n.roomTypeId,
      date: n.date,
      total: n.total,
      booked: n.booked,
      held: n.held,
      stopSell: n.stopSell,
    })),
    rates: rates.flatMap((c) =>
      dates.map((date) => {
        const d = /** @type {any} */ (byCell.get(`${c.ratePlanId}|${c.roomTypeId}|${date}`));
        return {
          ratePlanId: c.ratePlanId,
          roomTypeId: c.roomTypeId,
          date,
          exists: Boolean(d),
          prices: (d?.prices ?? []).map((/** @type {any} */ p) => ({ guests: p.guests, amount: p.amount })),
          ...Object.fromEntries(RULE_FIELDS.map((k) => [k, d?.[k] ?? /** @type {any} */ (RULE_DEFAULTS)[k]])),
        };
      }),
    ),
  };
}

/** Nights whose rooms can't go down to `total`. @param {{ nights: any[] }} before @param {RoomChange[]} rooms */
export function refusedReductions(before, rooms) {
  return rooms.flatMap((r) =>
    r.total === undefined
      ? []
      : before.nights
          .filter((n) => n.roomTypeId === r.roomTypeId && n.booked + n.held > /** @type {number} */ (r.total))
          .map((n) => ({ roomTypeId: n.roomTypeId, date: n.date, booked: n.booked, held: n.held })),
  );
}

/** @param {Owner} o @param {RoomChange[]} rooms @param {string[]} dates */
export async function applyRooms(o, rooms, dates) {
  for (const r of rooms) {
    const base = { hotelOrgId: o.hotelOrgId, propertyId: o.propertyId, roomTypeId: r.roomTypeId, date: { $in: dates } };
    if (r.total !== undefined)
      await InventoryDayRecord.updateMany(
        { ...base, $expr: { $lte: [{ $add: ['$booked', '$held'] }, r.total] } },
        { $set: { total: r.total }, $inc: { version: 1 } },
      );
    if (r.stopSell !== undefined) await InventoryDayRecord.updateMany(base, { $set: { stopSell: r.stopSell }, $inc: { version: 1 } });
  }
}

/** The pipeline that merges one change into a stored night. @param {Owner} o @param {RateChange} c @param {string} date */
function ratePipeline(o, c, date) {
  /** @type {Record<string, unknown>} */
  const set = { hotelOrgId: o.hotelOrgId, propertyId: o.propertyId, ratePlanId: c.ratePlanId, roomTypeId: c.roomTypeId, date };
  if (c.prices && c.prices.length > 0) {
    const touched = c.prices.map((p) => p.guests);
    const added = c.prices.filter((p) => p.amount !== null).map((p) => ({ guests: p.guests, amount: p.amount }));
    set.prices = {
      $concatArrays: [
        { $filter: { input: { $ifNull: ['$prices', []] }, as: 'p', cond: { $not: [{ $in: ['$$p.guests', touched] }] } } },
        { $literal: added },
      ],
    };
  } else set.prices = { $ifNull: ['$prices', []] };
  for (const k of RULE_FIELDS) {
    const v = /** @type {Record<string, unknown>} */ (c)[k];
    set[k] = v === undefined ? { $ifNull: [`$${k}`, { $literal: /** @type {any} */ (RULE_DEFAULTS)[k] }] } : { $literal: v };
  }
  set.version = { $add: [{ $ifNull: ['$version', 0] }, 1] };
  set.createdAt = { $ifNull: ['$createdAt', '$$NOW'] };
  set.updatedAt = '$$NOW';
  return [{ $set: set }];
}

/** @param {Owner} o @param {RateChange[]} rates @param {string[]} dates */
export async function applyRates(o, rates, dates) {
  const ops = rates.flatMap((c) =>
    dates.map((date) => ({
      updateOne: {
        filter: { hotelOrgId: o.hotelOrgId, ratePlanId: c.ratePlanId, roomTypeId: c.roomTypeId, date },
        update: ratePipeline(o, c, date),
        upsert: true,
        timestamps: false,
      },
    })),
  );
  if (ops.length > 0) await RateDayRecord.bulkWrite(/** @type {any} */ (ops), { ordered: false });
}

/**
 * Puts the "before" values back (undo). Rooms follow the same guard — nights booked meanwhile are listed.
 * @param {Owner} o @param {{ nights: any[], rates: any[] }} before
 */
export async function restore(o, before) {
  const refused = [];
  for (const n of before.nights) {
    const filter = { hotelOrgId: o.hotelOrgId, roomTypeId: n.roomTypeId, date: n.date };
    const res = await InventoryDayRecord.updateOne(
      { ...filter, $expr: { $lte: [{ $add: ['$booked', '$held'] }, n.total] } },
      { $set: { total: n.total, stopSell: n.stopSell }, $inc: { version: 1 } },
    );
    if (res.matchedCount === 0) refused.push({ roomTypeId: n.roomTypeId, date: n.date });
  }
  for (const r of before.rates) {
    const values = { prices: r.prices, ...Object.fromEntries(RULE_FIELDS.map((k) => [k, r[k]])) };
    await RateDayRecord.updateOne(
      { hotelOrgId: o.hotelOrgId, ratePlanId: r.ratePlanId, roomTypeId: r.roomTypeId, date: r.date },
      { $set: { ...values, propertyId: o.propertyId }, $inc: { version: 1 } },
      { upsert: true },
    );
  }
  return refused;
}
