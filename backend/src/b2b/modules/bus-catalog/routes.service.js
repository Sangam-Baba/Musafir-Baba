// @ts-check
/**
 * Routes (plan Stage 18 B3): ordered stops from the operator's own active points, with times; checked all at once
 * (`checkRoute`), first and last city different. Stops change only while DRAFT / CHANGES_REQUESTED — once sent or
 * approved, trips and seats depend on the order, so a changed route is a copy. Sent for approval with an event; a route
 * with an active schedule cannot be retired.
 */
import { newEvent } from '../../core/db/events.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { checkRoute } from './domain/route.js';
import { EVENTS } from './events.js';
import { RouteRecord } from './models/route.model.js';
import { ScheduleRecord } from './models/schedule.model.js';

/** @typedef {{ orgId: string, userId: string }} Operator */
/** @typedef {{ stopId: string, dayOffset: number, time: string, boarding: boolean, dropping: boolean }} StopInput */
/**
 * @typedef {{ clock: import('../../core/clock.js').Clock,
 *   stops: { activeByIds: (orgId: string, ids: string[]) => Promise<Map<string, { cityId: string }>> } }} RouteDeps
 */

const STOPS_EDITABLE = ['DRAFT', 'CHANGES_REQUESTED'];

/** @param {Record<string, any>} r */
export const routeDto = (r) => ({
  id: String(r._id),
  name: r.name,
  stops: r.stops.map((/** @type {any} */ s) => ({
    stopId: s.stopId,
    cityId: s.cityId,
    dayOffset: s.dayOffset,
    time: s.time,
    boarding: s.boarding,
    dropping: s.dropping,
  })),
  fromCityId: r.fromCityId,
  toCityId: r.toCityId,
  status: r.status,
  review: r.review,
  version: r.version,
  updatedAt: r.updatedAt,
});

/** @param {string} orgId @param {string} id */
async function own(orgId, id) {
  const r = /^[a-f0-9]{24}$/.test(id) ? await RouteRecord.findOne({ _id: id, operatorOrgId: orgId }).lean() : null;
  if (!r) throw new NotFoundError('ROUTE_NOT_FOUND');
  return /** @type {Record<string, any>} */ (r);
}

/** Stops checked and joined with their cities. @param {RouteDeps} deps @param {string} orgId @param {StopInput[]} input */
async function resolveStops(deps, orgId, input) {
  const problems = checkRoute(input);
  const known = await deps.stops.activeByIds(
    orgId,
    input.map((s) => s.stopId),
  );
  input.forEach((s, i) => known.has(s.stopId) || problems.push({ path: `stops.${i}.stopId`, code: 'STOP_NOT_FOUND' }));
  const stops = input.map((s) => ({ ...s, cityId: known.get(s.stopId)?.cityId ?? '' }));
  if (!problems.length && stops[0]?.cityId === stops[stops.length - 1]?.cityId) problems.push({ path: 'stops', code: 'FROM_TO_SAME_CITY' });
  if (problems.length) throw new DomainError('ROUTE_INVALID', { problems });
  return { stops, fromCityId: stops[0]?.cityId, toCityId: stops[stops.length - 1]?.cityId };
}

/**
 * One conditional change (version + allowed statuses), with optional events.
 * @param {{ who: Operator, id: string, set: Record<string, unknown>, expectedVersion: number, statuses?: string[], events?: any[] }} a
 */
async function change({ who, id, set, expectedVersion, statuses, events = [] }) {
  const res = await RouteRecord.updateOne(
    { _id: id, operatorOrgId: who.orgId, version: expectedVersion, status: statuses ? { $in: statuses } : { $ne: 'RETIRED' } },
    {
      $set: { ...set, ...(events.length ? { hasPendingEvents: true } : {}) },
      $inc: { version: 1 },
      ...(events.length ? { $push: { pendingEvents: { $each: events } } } : {}),
    },
  );
  if (res.modifiedCount !== 1) {
    const r = await own(who.orgId, id);
    if (r.version === expectedVersion) throw new ConflictError('ROUTE_NOT_EDITABLE', { status: r.status });
    throw new ConflictError('VERSION_CONFLICT');
  }
  return routeDto(await own(who.orgId, id));
}

/** @param {RouteDeps} deps */
export function createRoutes(deps) {
  return {
    /** @param {Operator} who @param {{ name: string, stops: StopInput[] }} a */
    async create(who, a) {
      const resolved = await resolveStops(deps, who.orgId, a.stops);
      const r = await RouteRecord.create({ operatorOrgId: who.orgId, name: a.name.trim(), ...resolved, createdBy: who.userId });
      return routeDto(r.toObject());
    },
    /** @param {Operator} who @param {string} id @param {{ name?: string, stops?: StopInput[], expectedVersion: number }} a */
    async update(who, id, a) {
      await own(who.orgId, id);
      const set = { ...(a.name ? { name: a.name.trim() } : {}), ...(a.stops ? await resolveStops(deps, who.orgId, a.stops) : {}) };
      return change({ who, id, set, expectedVersion: a.expectedVersion, statuses: a.stops ? STOPS_EDITABLE : undefined });
    },
    /** @param {Operator} who @param {string} id @param {string} name */
    async copy(who, id, name) {
      const r = await own(who.orgId, id);
      const c = await RouteRecord.create({
        operatorOrgId: who.orgId,
        name: name.trim(),
        stops: r.stops,
        fromCityId: r.fromCityId,
        toCityId: r.toCityId,
        createdBy: who.userId,
      });
      return routeDto(c.toObject());
    },
    /** @param {Operator} who @param {string} id @param {number} expectedVersion */
    async submit(who, id, expectedVersion) {
      const r = await own(who.orgId, id);
      const event = newEvent(EVENTS.routeSubmitted, { orgId: who.orgId, routeId: id, name: r.name }, deps);
      return change({ who, id, set: { status: 'SUBMITTED' }, expectedVersion, statuses: STOPS_EDITABLE, events: [event] });
    },
    /** @param {Operator} who @param {string} id @param {number} expectedVersion */
    async retire(who, id, expectedVersion) {
      if (await ScheduleRecord.exists({ operatorOrgId: who.orgId, routeId: id, status: 'ACTIVE' })) throw new ConflictError('ROUTE_IN_USE');
      return change({ who, id, set: { status: 'RETIRED' }, expectedVersion });
    },
    /** @param {string} orgId */
    list: async (orgId) => (await RouteRecord.find({ operatorOrgId: orgId }).sort({ createdAt: -1 }).limit(500).lean()).map(routeDto),
    /** @param {string} orgId @param {string} id */
    get: async (orgId, id) => routeDto(await own(orgId, id)),
  };
}
