// @ts-check
/**
 * Cell-by-cell writes for a calendar file (plan Stage 04 §3.7): the same guarded room update and the same
 * merge-inside-MongoDB price update as the bulk edit (calendar-writes.js), but each night carries its own values.
 * One bulk write per kind; rooms never go below booked + held (the refused nights are listed).
 */
import { RULE_FIELDS } from './domain/bulk-edit.js';
import { ratePipeline } from './calendar-writes.js';
import { InventoryDayRecord } from './models/inventory-day.model.js';
import { RateDayRecord } from './models/rate-day.model.js';

/** @typedef {{ hotelOrgId: string, propertyId: string }} Owner */
/** @typedef {import('./domain/import-rows.js').RoomCell} RoomCell */
/** @typedef {import('./domain/import-rows.js').RateCell} RateCell */

const RULE_DEFAULTS = { minLos: null, maxLos: null, closedToArrival: false, closedToDeparture: false, stopSell: false };

/** Values before the file (for the log and undo) — same shape as the bulk edit's. @param {Owner} o @param {RoomCell[]} rooms @param {RateCell[]} rates */
export async function cellSnapshot(o, rooms, rates) {
  const nightDocs = rooms.length
    ? await InventoryDayRecord.find({
        hotelOrgId: o.hotelOrgId,
        propertyId: o.propertyId,
        roomTypeId: { $in: [...new Set(rooms.map((r) => r.roomTypeId))] },
        date: { $in: [...new Set(rooms.map((r) => r.date))] },
      }).lean()
    : [];
  const night = new Map(nightDocs.map((n) => [`${n.roomTypeId}|${n.date}`, n]));
  const rateDocs = rates.length
    ? await RateDayRecord.find({
        hotelOrgId: o.hotelOrgId,
        propertyId: o.propertyId,
        ratePlanId: { $in: [...new Set(rates.map((r) => r.ratePlanId))] },
        date: { $in: [...new Set(rates.map((r) => r.date))] },
      }).lean()
    : [];
  const rate = new Map(rateDocs.map((d) => [`${d.ratePlanId}|${d.roomTypeId}|${d.date}`, d]));
  return {
    nights: rooms.flatMap((r) => {
      const n = night.get(`${r.roomTypeId}|${r.date}`);
      return n ? [{ roomTypeId: n.roomTypeId, date: n.date, total: n.total, booked: n.booked, held: n.held, stopSell: n.stopSell }] : [];
    }),
    rates: rates.map((c) => {
      const d = /** @type {any} */ (rate.get(`${c.ratePlanId}|${c.roomTypeId}|${c.date}`));
      return {
        ratePlanId: c.ratePlanId,
        roomTypeId: c.roomTypeId,
        date: c.date,
        exists: Boolean(d),
        prices: (d?.prices ?? []).map((/** @type {any} */ p) => ({ guests: p.guests, amount: p.amount })),
        ...Object.fromEntries(RULE_FIELDS.map((k) => [k, d?.[k] ?? /** @type {any} */ (RULE_DEFAULTS)[k]])),
      };
    }),
  };
}

/** Stop-sell always applies; rooms only where they stay ≥ booked + held. @param {Owner} o @param {RoomCell[]} rooms */
export async function applyRoomCells(o, rooms) {
  const ops = rooms.flatMap((r) => {
    const base = { hotelOrgId: o.hotelOrgId, roomTypeId: r.roomTypeId, date: r.date };
    const out = [];
    if (r.stopSell !== undefined)
      out.push({ updateOne: { filter: base, update: { $set: { stopSell: r.stopSell }, $inc: { version: 1 } } } });
    if (r.total !== undefined)
      out.push({
        updateOne: {
          filter: { ...base, $expr: { $lte: [{ $add: ['$booked', '$held'] }, r.total] } },
          update: { $set: { total: r.total }, $inc: { version: 1 } },
        },
      });
    return out;
  });
  if (ops.length > 0) await InventoryDayRecord.bulkWrite(ops, { ordered: false });
}

/** @param {Owner} o @param {RateCell[]} rates */
export async function applyRateCells(o, rates) {
  const ops = rates.map(({ date, ...c }) => ({
    updateOne: {
      filter: { hotelOrgId: o.hotelOrgId, ratePlanId: c.ratePlanId, roomTypeId: c.roomTypeId, date },
      update: ratePipeline(o, c, date),
      upsert: true,
      timestamps: false,
    },
  }));
  if (ops.length > 0) await RateDayRecord.bulkWrite(/** @type {any} */ (ops), { ordered: false });
}
