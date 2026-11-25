// @ts-check
/**
 * Trip problems (plan Stage 18 B7): the bus company reports (own trips only; event → ops queue), sees its reports; ops
 * see the queue and resolve with a note (repeat-safe, conditional on OPEN).
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, NotFoundError } from '../../core/errors.js';
import { TripProblemRecord } from './models/trip-problem.model.js';
import { TripRecord } from './models/trip.model.js';

const OPS = systemScope('bus-inventory: trip problems queue', { routine: true });
export const TRIP_PROBLEM_REPORTED = 'bus-inventory.trip-problem.reported';

/** @param {Record<string, any>} p */
export const problemDto = (p) => ({
  id: String(p._id),
  operatorOrgId: p.operatorOrgId,
  tripId: p.tripId,
  tripDate: p.tripDate,
  kind: p.kind,
  note: p.note,
  delayMinutes: p.delayMinutes,
  status: p.status,
  reportedBy: p.reportedBy,
  resolvedBy: p.resolvedBy,
  resolution: p.resolution,
  createdAt: p.createdAt,
});

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createTripProblems(deps) {
  return {
    /** @param {{ orgId: string, userId: string }} who @param {string} tripId @param {{ kind: string, note: string, delayMinutes?: number | null }} a */
    async report(who, tripId, a) {
      const t = /^[a-f0-9]{24}$/.test(tripId) ? await TripRecord.findOne({ _id: tripId, operatorOrgId: who.orgId }).lean() : null;
      if (!t) throw new NotFoundError('TRIP_NOT_FOUND');
      const doc = new TripProblemRecord({
        operatorOrgId: who.orgId,
        tripId,
        tripDate: t.date,
        kind: a.kind,
        note: a.note.trim(),
        delayMinutes: a.delayMinutes ?? null,
        reportedBy: `user:${who.userId}`,
      });
      doc.set({
        pendingEvents: [newEvent(TRIP_PROBLEM_REPORTED, { orgId: who.orgId, problemId: String(doc._id), tripId, kind: a.kind }, deps)],
        hasPendingEvents: true,
      });
      await doc.save();
      return problemDto(doc.toObject());
    },
    /** @param {string} orgId */
    mine: async (orgId) =>
      (await TripProblemRecord.find({ operatorOrgId: orgId }).sort({ createdAt: -1 }).limit(200).lean()).map(problemDto),
    /** @param {{ status?: 'OPEN' | 'RESOLVED' }} q */
    queue: async (q) =>
      (
        await TripProblemRecord.find({ status: q.status ?? 'OPEN' })
          .setOptions(OPS)
          .sort({ createdAt: 1 })
          .limit(200)
          .lean()
      ).map(problemDto),
    /** @param {string} by @param {string} id @param {string} resolution */
    async resolve(by, id, resolution) {
      const res = /^[a-f0-9]{24}$/.test(id)
        ? await TripProblemRecord.updateOne(
            { _id: id, status: 'OPEN' },
            { $set: { status: 'RESOLVED', resolvedBy: by, resolvedAt: deps.clock.now(), resolution: resolution.trim() } },
          ).setOptions(OPS)
        : { modifiedCount: 0 };
      if (res.modifiedCount !== 1)
        throw (await TripProblemRecord.exists({ _id: id }).setOptions(OPS))
          ? new ConflictError('PROBLEM_ALREADY_RESOLVED')
          : new NotFoundError('PROBLEM_NOT_FOUND');
      return problemDto(/** @type {any} */ (await TripProblemRecord.findById(id).setOptions(OPS).lean()));
    },
  };
}
