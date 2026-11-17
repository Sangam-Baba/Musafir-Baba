// @ts-check
/**
 * Calendar files (plan Stage 04 §3.7): `GET …/calendar-imports/template` and `POST …/calendar-imports`.
 * - always checked first: every problem with its line and column (up to 1000 listed); nothing is written while
 *   any problem remains;
 * - `dryRun` (default) says what would change: nights, rooms refused (booked + held above the new number),
 *   prices moving more than 50 %;
 * - applying needs a `requestId` (repeat → first result), `confirmBigChange` for > 50 % moves, is logged with the
 *   values before (undo works like for a bulk edit) and stores `inventory.changed` with the log entry.
 */
import { ConflictError, DomainError } from '../../core/errors.js';
import { context } from './calendar-edit.service.js';
import { bigChanges } from './domain/bulk-edit.js';
import { parseCsv, toCsv } from './domain/csv.js';
import { addDays, isDate } from './domain/dates.js';
import { MAX_IMPORT_ROWS, readHeader, readRows } from './domain/import-rows.js';
import { applyRateCells, applyRoomCells, cellSnapshot } from './import-writes.js';
import { inventoryChangedEvent } from './inventory-events.js';
import { ensureNights } from './inventory-days.js';
import { ChangeLogRecord } from './models/change-log.model.js';
import { RatePlanRecord } from './models/rate-plan.model.js';
import { PERMISSIONS } from './permissions.js';
import { ratePlanDto } from './rate-plan.service.js';

/** @typedef {import('../../core/context.js').RequestContext} Ctx */
/** @typedef {import('./calendar-edit.service.js').EditDeps} ImportDeps */
/** @typedef {{ csv: string, dryRun: boolean, requestId: string | null, confirmBigChange: boolean }} ImportRequest */

/** @param {Ctx} ctx */
const actorOf = (ctx) => (ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system');

/** @param {ImportDeps} deps @param {Ctx} ctx @param {string} propertyId @param {any} p */
async function refs(deps, ctx, propertyId, p) {
  const [roomTypes, planDocs] = await Promise.all([
    deps.roomTypesOf(ctx, propertyId),
    RatePlanRecord.find({ hotelOrgId: p.hotelOrgId, propertyId, status: { $in: ['ACTIVE', 'INACTIVE'] } }).lean(),
  ]);
  return { roomTypes: /** @type {{ id: string, name: string, maxOccupancy: number }[]} */ (roomTypes), plans: planDocs.map(ratePlanDto) };
}

/** Read + check the file. @param {string} csv @param {{ roomTypes: any[], plans: any[], today: string, windowEnd: string }} r */
function readFile(csv, r) {
  const [header = [], ...rows] = parseCsv(csv, MAX_IMPORT_ROWS);
  const head = readHeader(header);
  if (head.errors.length > 0) return { rows: rows.length, errors: head.errors, rooms: [], rates: [] };
  return {
    rows: rows.length,
    ...readRows({ cols: head.cols, rows, roomTypes: r.roomTypes, plans: r.plans, today: r.today, windowEnd: r.windowEnd, isDate }),
  };
}

/** @param {ImportDeps} deps @param {Ctx} ctx @param {string} propertyId @param {ImportRequest} req */
async function importFile(deps, ctx, propertyId, req) {
  const { p, owner, today, windowEnd } = await context(deps, ctx, propertyId);
  if (!req.dryRun && !req.requestId) throw new DomainError('IMPORT_REQUEST_ID_REQUIRED');
  if (req.requestId) {
    const repeat = await ChangeLogRecord.findOne({
      hotelOrgId: p.hotelOrgId,
      propertyId,
      requestId: req.requestId,
      status: 'APPLIED',
    }).lean();
    if (repeat) return /** @type {any} */ (repeat).result;
  }
  const file = readFile(req.csv, { ...(await refs(deps, ctx, propertyId, p)), today, windowEnd });
  if (file.rows === 0) throw new DomainError('IMPORT_EMPTY');
  if (file.errors.length > 0) return { ok: false, dryRun: true, rows: file.rows, errors: file.errors };
  const byRoomType = new Map();
  for (const c of file.rooms) byRoomType.set(c.roomTypeId, [...(byRoomType.get(c.roomTypeId) ?? []), c.date]);
  for (const [roomTypeId, dates] of byRoomType) await ensureNights({ ...owner, roomTypeIds: [roomTypeId], dates });
  const before = await cellSnapshot(owner, file.rooms, file.rates);
  const refused = file.rooms.flatMap((c) =>
    before.nights
      .filter(
        (n) =>
          c.total !== undefined &&
          n.roomTypeId === c.roomTypeId &&
          n.date === c.date &&
          n.booked + n.held > /** @type {number} */ (c.total),
      )
      .map((n) => ({ roomTypeId: n.roomTypeId, date: n.date, booked: n.booked, held: n.held })),
  );
  const warnings = file.rates.flatMap((c, i) =>
    bigChanges(before.rates[i]?.prices ?? [], c.prices ?? []).map((w) => ({
      ratePlanId: c.ratePlanId,
      roomTypeId: c.roomTypeId,
      date: c.date,
      ...w,
    })),
  );
  const outcome = {
    ok: true,
    rows: file.rows,
    roomNights: file.rooms.length,
    rateNights: file.rates.length,
    refused,
    warnings: warnings.slice(0, 200),
    errors: [],
  };
  if (req.dryRun) return { dryRun: true, ...outcome };
  if (warnings.length > 0 && !req.confirmBigChange) throw new ConflictError('BIG_PRICE_CHANGE', { warnings: warnings.slice(0, 50) });
  return apply(ctx, owner, { req, file, before, outcome, at: deps.clock.now() });
}

/** @param {Ctx} ctx @param {{ hotelOrgId: string, propertyId: string }} owner @param {{ req: ImportRequest, file: any, before: any, outcome: any, at: Date }} x */
async function apply(ctx, owner, x) {
  const dates = [...x.file.rooms, ...x.file.rates].map((c) => c.date).sort();
  const from = dates[0] ?? '';
  const to = addDays(dates[dates.length - 1] ?? from, 1);
  const log = await ChangeLogRecord.create({
    ...owner,
    requestId: x.req.requestId,
    kind: 'IMPORT',
    status: 'APPLYING',
    by: actorOf(ctx),
    month: x.at.toISOString().slice(0, 7),
    from,
    to,
    request: { rows: x.file.rows },
    before: x.before,
  }).catch((e) => {
    if (e?.code === 11000) throw new ConflictError('CALENDAR_EDIT_IN_PROGRESS');
    throw e;
  });
  await applyRoomCells(owner, x.file.rooms);
  await applyRateCells(owner, x.file.rates);
  const result = { changeId: String(log._id), dryRun: false, ...x.outcome };
  const event = inventoryChangedEvent(
    {
      orgId: owner.hotelOrgId,
      propertyId: owner.propertyId,
      roomTypeIds: [...x.file.rooms, ...x.file.rates].map((c) => c.roomTypeId),
      dates,
    },
    x.at,
  );
  await ChangeLogRecord.updateOne(
    { _id: log._id, hotelOrgId: owner.hotelOrgId },
    { $set: { status: 'APPLIED', result, hasPendingEvents: true }, $push: { pendingEvents: event } },
  );
  return result;
}

/** A starter file with the property's room types and plans (names alongside the ids). @param {ImportDeps} deps @param {Ctx} ctx @param {string} propertyId */
async function template(deps, ctx, propertyId) {
  const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.calendarRead);
  const { roomTypes, plans } = await refs(deps, ctx, propertyId, p);
  const maxGuests = Math.max(1, ...roomTypes.map((r) => r.maxOccupancy));
  const guests = Array.from({ length: maxGuests }, (_, i) => `price_${i + 1}`);
  const header = [
    'date',
    'room_type',
    'room_type_name',
    'rate_plan',
    'rate_plan_name',
    'rooms',
    'stop_sell',
    'price',
    ...guests,
    'min_stay',
    'max_stay',
    'closed_to_arrival',
    'closed_to_departure',
  ];
  const day = addDays(deps.clock.now().toISOString().slice(0, 10), 1);
  const rows = roomTypes.flatMap((rt) => [
    [day, rt.id, rt.name, '', '', '', ''],
    ...plans.filter((pl) => pl.roomTypeIds.includes(rt.id)).map((pl) => [day, rt.id, rt.name, pl.id, pl.name]),
  ]);
  return toCsv([header, ...rows.map((r) => [...r, ...Array(header.length - r.length).fill('')])]);
}

/** @param {ImportDeps} deps */
export function createCalendarImportService(deps) {
  return {
    /** @param {Ctx} ctx @param {string} propertyId @param {ImportRequest} req */
    importFile: (ctx, propertyId, req) => importFile(deps, ctx, propertyId, req),
    /** @param {Ctx} ctx @param {string} propertyId */
    template: (ctx, propertyId) => template(deps, ctx, propertyId),
  };
}
