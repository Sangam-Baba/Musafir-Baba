// @ts-check
/**
 * Changing the calendar in bulk (plan Stage 04 §3.5, §3.6, §3.12): `PUT /hotel/properties/:id/calendar`.
 * A range + optional weekdays; rooms (total, stop-sell) per room type and prices / rules per plan × room type.
 * - past nights (the property's date) and nights beyond the window are skipped and listed;
 * - rooms never go below booked + held — those nights are listed;
 * - `preview: true` says what would happen and writes nothing;
 * - a price moving more than 50 % needs `confirmBigChange: true`;
 * - every change is logged with the values before it; the latest one can be undone;
 * - the same `requestId` twice returns the first result (double clicks, retries).
 */
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { DEFAULT_TIME_ZONE } from '../hotel-catalog/index.js';
import { applyRates, applyRooms, refusedReductions, restore, snapshot } from './calendar-writes.js';
import { bigChanges, MAX_EDIT_CELLS, MAX_EDIT_NIGHTS, rateChangeProblems, selectDates } from './domain/bulk-edit.js';
import { addDays, CALENDAR_WINDOW_DAYS, nights, todayIn, weekday } from './domain/dates.js';
import { ensureNights } from './inventory-days.js';
import { ChangeLogRecord } from './models/change-log.model.js';
import { RatePlanRecord } from './models/rate-plan.model.js';
import { PERMISSIONS } from './permissions.js';
import { ratePlanDto } from './rate-plan.service.js';

/** @typedef {import('../../core/context.js').RequestContext} Ctx */
/** @typedef {import('./domain/bulk-edit.js').RoomChange} RoomChange */
/** @typedef {import('./domain/bulk-edit.js').RateChange} RateChange */
/**
 * @typedef {{ requestId: string, from: string, to: string, weekdays: number[] | null, rooms: RoomChange[], rates: RateChange[],
 *   preview: boolean, confirmBigChange: boolean }} EditRequest
 * @typedef {{ properties: { loadOwned: (ctx: Ctx, id: string, permission: string) => Promise<any> },
 *   roomTypesOf: (ctx: Ctx, propertyId: string) => Promise<{ id: string, maxOccupancy: number }[]>, clock: import('../../core/clock.js').Clock }} EditDeps
 */

/** The same request id is being applied right now (or its first try stopped half way). @param {unknown} error */
const inProgress = (error) => {
  if (/** @type {{ code?: number }} */ (error).code === 11000) throw new ConflictError('CALENDAR_EDIT_IN_PROGRESS');
  throw error;
};

/** @param {Ctx} ctx */
const actorOf = (ctx) => (ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system');

/** Every change refers to this property's room types / plans and makes sense. @param {EditRequest} req @param {any[]} roomTypes @param {any[]} plans */
function checkChanges(req, roomTypes, plans) {
  const rt = new Map(roomTypes.map((r) => [r.id, r]));
  const pl = new Map(plans.map((p) => [p.id, p]));
  /** @type {{ path: string, code: string }[]} */
  const errors = [];
  req.rooms.forEach((r, i) => {
    if (!rt.has(r.roomTypeId)) errors.push({ path: `rooms.${i}.roomTypeId`, code: 'ROOM_TYPE_UNKNOWN' });
    if (r.total === undefined && r.stopSell === undefined) errors.push({ path: `rooms.${i}`, code: 'NOTHING_TO_CHANGE' });
  });
  req.rates.forEach((c, i) => {
    for (const code of rateChangeProblems(c, pl.get(c.ratePlanId), rt.get(c.roomTypeId))) errors.push({ path: `rates.${i}`, code });
  });
  if (req.rooms.length + req.rates.length === 0) errors.push({ path: '', code: 'NOTHING_TO_CHANGE' });
  if (errors.length > 0) throw new DomainError('CALENDAR_EDIT_INVALID', { errors });
}

/** Prices moving more than 50 %. @param {RateChange[]} rates @param {{ rates: any[] }} before */
function priceWarnings(rates, before) {
  return rates.flatMap((c) =>
    before.rates
      .filter((b) => b.ratePlanId === c.ratePlanId && b.roomTypeId === c.roomTypeId)
      .flatMap((b) =>
        bigChanges(b.prices, c.prices ?? []).map((w) => ({ ratePlanId: c.ratePlanId, roomTypeId: c.roomTypeId, date: b.date, ...w })),
      ),
  );
}

/** @param {EditDeps} deps @param {Ctx} ctx @param {string} propertyId */
async function context(deps, ctx, propertyId) {
  const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.calendarManage);
  if (p.status === 'ARCHIVED') throw new DomainError('PROPERTY_ARCHIVED');
  const today = todayIn(p.timeZone || DEFAULT_TIME_ZONE, deps.clock.now());
  return { p, owner: { hotelOrgId: p.hotelOrgId, propertyId }, today, windowEnd: addDays(today, CALENDAR_WINDOW_DAYS) };
}

/** @param {EditDeps} deps @param {Ctx} ctx @param {string} propertyId @param {EditRequest} req */
async function edit(deps, ctx, propertyId, req) {
  const { p, owner, today, windowEnd } = await context(deps, ctx, propertyId);
  const repeat = await ChangeLogRecord.findOne({
    hotelOrgId: p.hotelOrgId,
    propertyId,
    requestId: req.requestId,
    status: 'APPLIED',
  }).lean();
  if (repeat) return /** @type {any} */ (repeat).result;
  const sel = selectDates(nights(req.from, req.to, MAX_EDIT_NIGHTS), { weekdays: req.weekdays, today, windowEnd, weekdayOf: weekday });
  const [roomTypes, planDocs] = await Promise.all([
    deps.roomTypesOf(ctx, propertyId),
    RatePlanRecord.find({ hotelOrgId: p.hotelOrgId, propertyId, status: { $in: ['ACTIVE', 'INACTIVE'] } }).lean(),
  ]);
  checkChanges(req, roomTypes, planDocs.map(ratePlanDto));
  if (sel.dates.length * (req.rooms.length + req.rates.length) > MAX_EDIT_CELLS)
    throw new DomainError('CALENDAR_EDIT_TOO_BIG', { maxCells: MAX_EDIT_CELLS });
  await ensureNights({ ...owner, roomTypeIds: [...new Set(req.rooms.map((r) => r.roomTypeId))], dates: sel.dates });
  const before = await snapshot(owner, sel.dates, req.rooms, req.rates);
  const outcome = {
    nights: sel.dates.length,
    refused: refusedReductions(before, req.rooms),
    skipped: { past: sel.past, beyondWindow: sel.beyondWindow },
    warnings: priceWarnings(req.rates, before),
  };
  if (req.preview || sel.dates.length === 0) return { preview: true, ...outcome };
  if (outcome.warnings.length > 0 && !req.confirmBigChange)
    throw new ConflictError('BIG_PRICE_CHANGE', { warnings: outcome.warnings.slice(0, 50) });
  return apply(ctx, owner, req, { dates: sel.dates, before, outcome, at: deps.clock.now() });
}

/** @param {Ctx} ctx @param {{ hotelOrgId: string, propertyId: string }} owner @param {EditRequest} req @param {{ dates: string[], before: any, outcome: any, at: Date }} x */
async function apply(ctx, owner, req, x) {
  const at = x.at;
  const log = await ChangeLogRecord.create({
    ...owner,
    requestId: req.requestId,
    kind: 'EDIT',
    status: 'APPLYING',
    by: actorOf(ctx),
    month: at.toISOString().slice(0, 7),
    from: req.from,
    to: req.to,
    weekdays: req.weekdays,
    request: { rooms: req.rooms, rates: req.rates, dates: x.dates },
    before: x.before,
  }).catch(inProgress);
  await applyRooms(owner, req.rooms, x.dates);
  await applyRates(owner, req.rates, x.dates);
  const result = { changeId: String(log._id), preview: false, ...x.outcome };
  await ChangeLogRecord.updateOne({ _id: log._id, hotelOrgId: owner.hotelOrgId }, { $set: { status: 'APPLIED', result } });
  return result;
}

/** Undo the property's latest change (only that one). @param {EditDeps} deps @param {Ctx} ctx @param {string} propertyId @param {string} changeId */
async function undo(deps, ctx, propertyId, changeId) {
  const { p, owner } = await context(deps, ctx, propertyId);
  const latest = await ChangeLogRecord.findOne({
    hotelOrgId: p.hotelOrgId,
    propertyId,
    status: 'APPLIED',
    kind: { $ne: 'UNDO' },
    undoneAt: null,
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  if (!latest) throw new NotFoundError('NOTHING_TO_UNDO');
  if (String(latest._id) !== changeId) throw new ConflictError('UNDO_NOT_LATEST', { latestChangeId: String(latest._id) });
  const at = deps.clock.now();
  const claimed = await ChangeLogRecord.updateOne(
    { _id: latest._id, hotelOrgId: p.hotelOrgId, undoneAt: null },
    { $set: { undoneAt: at } },
  );
  if (claimed.modifiedCount !== 1) throw new ConflictError('UNDO_NOT_LATEST');
  const refused = await restore(owner, /** @type {any} */ (latest).before);
  await ChangeLogRecord.create({
    ...owner,
    requestId: `undo:${changeId}`,
    kind: 'UNDO',
    status: 'APPLIED',
    by: actorOf(ctx),
    month: at.toISOString().slice(0, 7),
    from: latest.from,
    to: latest.to,
    request: {},
    before: {},
    result: { refused },
    undoOf: changeId,
  });
  return { undone: changeId, refused };
}

/** @param {EditDeps} deps */
export function createCalendarEditService(deps) {
  return {
    /** @param {Ctx} ctx @param {string} propertyId @param {EditRequest} req */
    edit: (ctx, propertyId, req) => edit(deps, ctx, propertyId, req),
    /** @param {Ctx} ctx @param {string} propertyId @param {string} changeId */
    undo: (ctx, propertyId, changeId) => undo(deps, ctx, propertyId, changeId),
    /** Recent changes (who, when, which nights) without the stored values. @param {Ctx} ctx @param {string} propertyId */
    async history(ctx, propertyId) {
      const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.calendarRead);
      const docs = await ChangeLogRecord.find({ hotelOrgId: p.hotelOrgId, propertyId, status: 'APPLIED' }, { before: 0, request: 0 })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();
      return docs.map((d) => ({
        id: String(d._id),
        kind: d.kind,
        by: d.by,
        at: d.createdAt,
        from: d.from,
        to: d.to,
        weekdays: d.weekdays,
        reason: d.reason,
        undoOf: d.undoOf,
        undoneAt: d.undoneAt,
        result: d.result,
      }));
    },
  };
}
