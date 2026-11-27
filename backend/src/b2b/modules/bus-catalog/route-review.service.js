// @ts-check
/**
 * Route review (MusafirBaba staff, plan Stage 18 B3): routes waiting (oldest first, with stop names and cities);
 * approve / ask for changes (note) / suspend (note) / reinstate — conditional on the status, each with an event for the
 * operator. Only approved routes get trips.
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { REVIEW_MOVES } from './domain/vehicle.js';
import { EVENTS } from './events.js';
import { RouteRecord } from './models/route.model.js';
import { StopRecord } from './models/stop.model.js';
import { routeDto } from './routes.service.js';

const SCOPE = systemScope('bus-catalog: route review', { routine: true });
const EVENT_OF = /** @type {const} */ ({
  approve: EVENTS.routeApproved,
  requestChanges: EVENTS.routeChangesRequested,
  suspend: EVENTS.routeSuspended,
});

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createRouteReview(deps) {
  return {
    /** @param {{ status?: string }} q */
    async queue(q) {
      const list = await RouteRecord.find({ status: q.status ?? 'SUBMITTED' })
        .setOptions(SCOPE)
        .sort({ updatedAt: 1 })
        .limit(200)
        .lean();
      const ids = [...new Set(list.flatMap((r) => r.stops.map((s) => s.stopId)))];
      const stops = new Map(
        (
          await StopRecord.find({ _id: { $in: ids } })
            .setOptions(SCOPE)
            .lean()
        ).map((s) => [String(s._id), s.name]),
      );
      return list.map((r) => ({
        ...routeDto(r),
        operatorOrgId: r.operatorOrgId,
        stopNames: Object.fromEntries(r.stops.map((s) => [s.stopId, stops.get(s.stopId) ?? null])),
      }));
    },
    /** @param {string} by @param {string} id @param {keyof typeof REVIEW_MOVES} move @param {string | null} note */
    async decide(by, id, move, note) {
      if (!REVIEW_MOVES[move] || move === 'submit') throw new DomainError('MOVE_INVALID');
      if ((move === 'requestChanges' || move === 'suspend') && !note?.trim()) throw new DomainError('NOTE_REQUIRED');
      const r = /^[a-f0-9]{24}$/.test(id) ? /** @type {any} */ (await RouteRecord.findOne({ _id: id }).setOptions(SCOPE).lean()) : null;
      if (!r) throw new NotFoundError('ROUTE_NOT_FOUND');
      const m = REVIEW_MOVES[move];
      const type = /** @type {Record<string, string>} */ (EVENT_OF)[move];
      const event = type ? newEvent(type, { orgId: r.operatorOrgId, routeId: id, name: r.name, note: note ?? null }, deps) : null;
      const res = await RouteRecord.updateOne(
        { _id: id, status: { $in: [...m.from] } },
        {
          $set: { status: m.to, review: { by, at: deps.clock.now(), note: note ?? null }, ...(event ? { hasPendingEvents: true } : {}) },
          $inc: { version: 1 },
          ...(event ? { $push: { pendingEvents: event } } : {}),
        },
      ).setOptions(SCOPE);
      if (res.modifiedCount !== 1) throw new ConflictError('ROUTE_STATUS_CHANGED', { status: r.status });
      return routeDto(/** @type {any} */ (await RouteRecord.findOne({ _id: id }).setOptions(SCOPE).lean()));
    },
  };
}
