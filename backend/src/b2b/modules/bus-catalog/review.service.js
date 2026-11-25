// @ts-check
/**
 * MusafirBaba review of buses (plan Stage 18 B2) and paper expiry reminders:
 *   queue → buses waiting (oldest first) with their layout and papers;
 *   approve / request changes (with a note) / suspend / reinstate — conditional on the status, each with an event
 *   (operator bell + email); a bus can be approved only with all four papers valid;
 *   reminders → for approved buses: a paper expiring in 30 / 7 days, or expired → one event each (repeat-safe).
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { paperProblems, remindersDue, REVIEW_MOVES } from './domain/vehicle.js';
import { EVENTS } from './events.js';
import { LayoutRecord } from './models/layout.model.js';
import { VehicleRecord } from './models/vehicle.model.js';
import { vehicleDto } from './vehicles.service.js';

const SCOPE = systemScope('bus-catalog: review and reminders', { routine: true });
const EVENT_OF = /** @type {const} */ ({
  approve: EVENTS.vehicleApproved,
  requestChanges: EVENTS.vehicleChangesRequested,
  suspend: EVENTS.vehicleSuspended,
});

/** @typedef {{ clock: import('../../core/clock.js').Clock, today: () => string }} ReviewDeps */

/** @param {Record<string, any>} v @param {keyof typeof REVIEW_MOVES} move @param {string | null} note @param {string} today */
function assertMove(v, move, note, today) {
  if (!REVIEW_MOVES[move] || move === 'submit') throw new DomainError('MOVE_INVALID');
  if ((move === 'requestChanges' || move === 'suspend') && !note?.trim()) throw new DomainError('NOTE_REQUIRED');
  if ((move === 'approve' || move === 'reinstate') && paperProblems(v.papers, today).length) throw new DomainError('PAPERS_INCOMPLETE');
}

/** @param {ReviewDeps} deps @param {{ by: string, id: string, move: keyof typeof REVIEW_MOVES, note: string | null }} a */
async function decide(deps, { by, id, move, note }) {
  const v = /^[a-f0-9]{24}$/.test(id) ? /** @type {any} */ (await VehicleRecord.findOne({ _id: id }).setOptions(SCOPE).lean()) : null;
  if (!v) throw new NotFoundError('BUS_NOT_FOUND');
  assertMove(v, move, note, deps.today());
  const m = REVIEW_MOVES[move];
  const type = /** @type {Record<string, string>} */ (EVENT_OF)[move];
  const event = type ? newEvent(type, { orgId: v.operatorOrgId, vehicleId: id, regNo: v.regNo, note: note ?? null }, deps) : null;
  const res = await VehicleRecord.updateOne(
    { _id: id, status: { $in: [...m.from] } },
    {
      $set: { status: m.to, review: { by, at: deps.clock.now(), note: note ?? null }, ...(event ? { hasPendingEvents: true } : {}) },
      $inc: { version: 1 },
      ...(event ? { $push: { pendingEvents: event } } : {}),
    },
  ).setOptions(SCOPE);
  if (res.modifiedCount !== 1) throw new ConflictError('BUS_STATUS_CHANGED', { status: v.status });
  return vehicleDto(/** @type {any} */ (await VehicleRecord.findOne({ _id: id }).setOptions(SCOPE).lean()), deps.today());
}

/** Paper reminders for approved buses (repeat-safe). @param {ReviewDeps} deps */
async function reminders(deps) {
  const today = deps.today();
  let sent = 0;
  for (const v of await VehicleRecord.find({ status: 'APPROVED' }).setOptions(SCOPE).limit(5000).lean()) {
    const due = remindersDue(/** @type {any} */ (v.papers), today, v.remindersSent ?? []);
    if (!due.length) continue;
    const events = due.map((d) =>
      newEvent(
        d.days < 0 ? EVENTS.paperExpired : EVENTS.paperExpiring,
        { orgId: v.operatorOrgId, vehicleId: String(v._id), regNo: v.regNo, paper: d.kind, days: d.days },
        deps,
      ),
    );
    await VehicleRecord.updateOne(
      { _id: v._id, remindersSent: { $nin: due.map((d) => d.key) } },
      { $push: { remindersSent: { $each: due.map((d) => d.key) }, pendingEvents: { $each: events } }, $set: { hasPendingEvents: true } },
    ).setOptions(SCOPE);
    sent += due.length;
  }
  return { sent };
}

/** @param {ReviewDeps} deps */
export function createBusReview(deps) {
  return {
    /** @param {{ status?: string }} q */
    async queue(q) {
      const list = await VehicleRecord.find({ status: q.status ?? 'SUBMITTED' })
        .setOptions(SCOPE)
        .sort({ updatedAt: 1 })
        .limit(200)
        .lean();
      const layouts = new Map(
        (
          await LayoutRecord.find({ _id: { $in: list.map((v) => v.layoutId).filter(Boolean) } })
            .setOptions(SCOPE)
            .lean()
        ).map((l) => [String(l._id), l]),
      );
      return list.map((v) => ({
        ...vehicleDto(v, deps.today()),
        operatorOrgId: v.operatorOrgId,
        layout: v.layoutId ? (layouts.get(v.layoutId) ?? null) : null,
      }));
    },
    /** @param {string} by @param {string} id @param {keyof typeof REVIEW_MOVES} move @param {string | null} note */
    decide: (by, id, move, note) => decide(deps, { by, id, move, note }),
    /** Paper reminders for approved buses (daily; repeat-safe). */
    reminders: () => reminders(deps),
  };
}
