// @ts-check
/**
 * MusafirBaba admin tools for calendars (plan Stage 04 §3.13): read any property's calendar, and override it on the
 * hotel's behalf — the same bulk change as the hotel's (guards, preview, > 50 % confirmation, undo), always with a
 * written reason, logged as `OVERRIDE` by `staff:<id>` (the hotel sees who and why in its change history). An admin
 * can never override a hotel company they belong to themselves.
 */
import { DomainError, ForbiddenError } from '../../core/errors.js';
import { DEFAULT_TIME_ZONE } from '../hotel-catalog/index.js';
import { calendarOf, MAX_CALENDAR_NIGHTS } from './calendar.service.js';
import { editWith } from './calendar-edit.service.js';
import { addDays, CALENDAR_WINDOW_DAYS, nights, todayIn } from './domain/dates.js';
import { ChangeLogRecord } from './models/change-log.model.js';

/** @typedef {import('./calendar-edit.service.js').EditRequest} EditRequest */
/**
 * @typedef {{ clock: import('../../core/clock.js').Clock,
 *   adminProperty: (id: string) => Promise<{ raw: any, roomTypes: { id: string, name: string, maxOccupancy: number }[] }>,
 *   isOwnOrg: (staffId: string, orgId: string) => Promise<boolean> }} AdminCalendarDeps
 */

/** @param {AdminCalendarDeps} deps */
export function createAdminCalendarService(deps) {
  return {
    /** @param {string} propertyId @param {{ from: string, to: string }} range */
    async read(propertyId, range) {
      nights(range.from, range.to, MAX_CALENDAR_NIGHTS);
      const { raw, roomTypes } = await deps.adminProperty(propertyId);
      return calendarOf(deps, raw, roomTypes, range);
    },

    /** @param {{ staffId: string }} who @param {string} propertyId @param {EditRequest} req @param {string} reason */
    async override(who, propertyId, req, reason) {
      if (reason.trim().length < 5) throw new DomainError('OVERRIDE_REASON_REQUIRED');
      const { raw, roomTypes } = await deps.adminProperty(propertyId);
      if (await deps.isOwnOrg(who.staffId, raw.hotelOrgId)) throw new ForbiddenError('OWN_ORGANISATION');
      if (raw.status === 'ARCHIVED') throw new DomainError('PROPERTY_ARCHIVED');
      const today = todayIn(raw.timeZone || DEFAULT_TIME_ZONE, deps.clock.now());
      return editWith(
        deps,
        {
          p: raw,
          owner: { hotelOrgId: raw.hotelOrgId, propertyId },
          today,
          windowEnd: addDays(today, CALENDAR_WINDOW_DAYS),
          roomTypes,
          by: `staff:${who.staffId}`,
          kind: 'OVERRIDE',
          reason: reason.trim(),
        },
        req,
      );
    },

    /** Recent changes of any property (who, when, why). @param {string} propertyId */
    async history(propertyId) {
      const { raw } = await deps.adminProperty(propertyId);
      const docs = await ChangeLogRecord.find({ hotelOrgId: raw.hotelOrgId, propertyId, status: 'APPLIED' }, { before: 0, request: 0 })
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
        reason: d.reason,
        undoOf: d.undoOf,
        undoneAt: d.undoneAt,
      }));
    },
  };
}
