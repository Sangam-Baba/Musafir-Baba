// @ts-check
/**
 * Schedules (plan Stage 18 B3): an approved route + an approved bus with a seat layout + weekdays + first / last day.
 * Not edited — ended from a day (the trip job cancels unsold trips from then) and replaced by a new one.
 * `forTrips()` / `ended()` feed the trip job in bus-inventory (system scope; ids and essentials only).
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { addDays } from './domain/route.js';
import { LayoutRecord } from './models/layout.model.js';
import { RouteRecord } from './models/route.model.js';
import { ScheduleRecord } from './models/schedule.model.js';
import { StopRecord } from './models/stop.model.js';
import { VehicleRecord } from './models/vehicle.model.js';

const SCOPE = systemScope('bus-catalog: schedules for the trip job', { routine: true });
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AHEAD_DAYS = 365;

/** @typedef {{ orgId: string, userId: string }} Operator */
/** @typedef {{ today: () => string }} ScheduleDeps */

/** @param {Record<string, any>} s */
export const scheduleDto = (s) => ({
  id: String(s._id),
  routeId: s.routeId,
  vehicleId: s.vehicleId,
  weekdays: s.weekdays,
  validFrom: s.validFrom,
  validTo: s.validTo,
  status: s.status,
  endedFrom: s.endedFrom,
  version: s.version,
});

/** @param {{ weekdays: number[], validFrom: string, validTo: string | null }} a @param {string} today */
function checkDates(a, today) {
  const days = new Set(a.weekdays);
  if (!a.weekdays.length || days.size !== a.weekdays.length || a.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
    throw new DomainError('WEEKDAYS_INVALID');
  if (!DATE.test(a.validFrom) || a.validFrom < today || a.validFrom > addDays(today, MAX_AHEAD_DAYS))
    throw new DomainError('START_DATE_INVALID');
  if (a.validTo !== null && (!DATE.test(a.validTo) || a.validTo < a.validFrom)) throw new DomainError('END_DATE_INVALID');
}

/** @param {ScheduleDeps} deps */
export function createSchedules(deps) {
  return {
    /** @param {Operator} who @param {{ routeId: string, vehicleId: string, weekdays: number[], validFrom: string, validTo: string | null }} a */
    async create(who, a) {
      checkDates(a, deps.today());
      const ok = (/** @type {string} */ id) => /^[a-f0-9]{24}$/.test(id);
      const route = ok(a.routeId) ? await RouteRecord.findOne({ _id: a.routeId, operatorOrgId: who.orgId }).lean() : null;
      if (!route) throw new NotFoundError('ROUTE_NOT_FOUND');
      if (route.status !== 'APPROVED') throw new ConflictError('ROUTE_NOT_APPROVED', { status: route.status });
      const bus = ok(a.vehicleId) ? await VehicleRecord.findOne({ _id: a.vehicleId, operatorOrgId: who.orgId }).lean() : null;
      if (!bus) throw new NotFoundError('BUS_NOT_FOUND');
      if (bus.status !== 'APPROVED' || !bus.layoutId) throw new ConflictError('BUS_NOT_APPROVED', { status: bus.status });
      const s = await ScheduleRecord.create({ operatorOrgId: who.orgId, ...a, weekdays: [...a.weekdays].sort(), createdBy: who.userId });
      return scheduleDto(s.toObject());
    },
    /** End from a day (today or later): no trips from then; unsold ones are cancelled. @param {Operator} who @param {string} id @param {{ from: string, expectedVersion: number }} a */
    async end(who, id, a) {
      if (!DATE.test(a.from) || a.from < deps.today()) throw new DomainError('END_DATE_INVALID');
      const res = /^[a-f0-9]{24}$/.test(id)
        ? await ScheduleRecord.updateOne(
            { _id: id, operatorOrgId: who.orgId, status: 'ACTIVE', version: a.expectedVersion },
            { $set: { status: 'ENDED', endedFrom: a.from }, $inc: { version: 1 } },
          )
        : { modifiedCount: 0 };
      const s = /^[a-f0-9]{24}$/.test(id) ? await ScheduleRecord.findOne({ _id: id, operatorOrgId: who.orgId }).lean() : null;
      if (!s) throw new NotFoundError('SCHEDULE_NOT_FOUND');
      if (res.modifiedCount !== 1) throw new ConflictError(s.status === 'ENDED' ? 'SCHEDULE_ENDED' : 'VERSION_CONFLICT');
      return scheduleDto(s);
    },
    /** @param {string} orgId */
    list: async (orgId) => (await ScheduleRecord.find({ operatorOrgId: orgId }).sort({ createdAt: -1 }).limit(500).lean()).map(scheduleDto),
    forTrips,
    /** Ended schedules (the trip job re-checks their unsold trips — repeat-safe). */
    ended: async () =>
      (await ScheduleRecord.find({ status: 'ENDED' }, { endedFrom: 1 }).setOptions(SCOPE).limit(5000).lean()).map((s) => ({
        scheduleId: String(s._id),
        from: /** @type {string} */ (s.endedFrom),
      })),
  };
}

/** Active schedules whose route and bus are approved, with stops (names, cities) and seats — what the trip job needs. */
async function forTrips() {
  const schedules = await ScheduleRecord.find({ status: 'ACTIVE' }).setOptions(SCOPE).limit(5000).lean();
  const ids = (/** @type {(s: any) => string} */ pick) => [...new Set(schedules.map(pick))];
  const [routes, buses] = await Promise.all([
    RouteRecord.find({ _id: { $in: ids((s) => s.routeId) }, status: 'APPROVED' })
      .setOptions(SCOPE)
      .lean(),
    VehicleRecord.find({ _id: { $in: ids((s) => s.vehicleId) }, status: 'APPROVED' })
      .setOptions(SCOPE)
      .lean(),
  ]);
  const layouts = await LayoutRecord.find({ _id: { $in: buses.map((b) => b.layoutId) } })
    .setOptions(SCOPE)
    .lean();
  const stopIds = [...new Set(routes.flatMap((r) => r.stops.map((s) => s.stopId)))];
  const names = new Map(
    (
      await StopRecord.find({ _id: { $in: stopIds } })
        .setOptions(SCOPE)
        .lean()
    ).map((s) => [String(s._id), s.name]),
  );
  const byId = (/** @type {any[]} */ list) => new Map(list.map((x) => [String(x._id), x]));
  const [R, B, L] = [byId(routes), byId(buses), byId(layouts)];
  return schedules.flatMap((s) => {
    const route = R.get(s.routeId);
    const bus = B.get(s.vehicleId);
    const layout = bus && L.get(bus.layoutId);
    if (!route || !layout) return [];
    return [
      {
        schedule: { id: String(s._id), operatorOrgId: s.operatorOrgId, weekdays: s.weekdays, validFrom: s.validFrom, validTo: s.validTo },
        route: { id: route._id.toString(), stops: route.stops.map((/** @type {any} */ x) => ({ ...x, name: names.get(x.stopId) ?? '' })) },
        vehicle: { id: bus._id.toString(), layoutId: String(layout._id), decks: layout.decks },
      },
    ];
  });
}
