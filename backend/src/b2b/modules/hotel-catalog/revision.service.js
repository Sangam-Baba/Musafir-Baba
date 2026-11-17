// @ts-check
/**
 * Pending revisions of live listings (plan Stage 03 §3.5, §6): MusafirBaba approves (the changes go live,
 * `revision.decided` + `property.updated`) or rejects them with a note; the hotel can cancel its own pending
 * revision. Approval names the revision it looked at (`revisionId`), so edits added in the meantime are never
 * approved unseen. The listing stays live throughout.
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { AppError, ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { PropertyRecord } from './models/property.model.js';
import { PERMISSIONS } from './permissions.js';

const ADMIN = systemScope('hotel-catalog: listing revision decision');

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock,
 *   properties: ReturnType<typeof import('./property.service.js').createPropertyService>,
 *   isOwnOrg?: (staffId: string, orgId: string) => Promise<boolean> }} RevisionDeps
 */

/** @param {RevisionDeps} deps */
export function createRevisionService(deps) {
  return {
    /** The hotel takes back its pending changes. @param {import('../../core/context.js').RequestContext} ctx @param {string} propertyId @param {number} version */
    async cancel(ctx, propertyId, version) {
      const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.propertyManage);
      if (!p.pendingRevision) throw new NotFoundError('REVISION_NOT_FOUND');
      const by = ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system';
      const res = await PropertyRecord.updateOne(
        { _id: p._id, hotelOrgId: p.hotelOrgId, version },
        {
          $set: { pendingRevision: null },
          $inc: { version: 1 },
          $push: { history: { at: deps.clock.now(), action: 'revision-withdrawn', status: p.status, by, note: null } },
        },
      );
      if (res.modifiedCount !== 1) throw new AppError('VERSION_CONFLICT', 412, 'The property was changed meanwhile — reload and try again');
      return deps.properties.get(ctx, propertyId);
    },

    /**
     * @param {{ staffId: string }} who
     * @param {string} propertyId
     * @param {{ revisionId: string, decision: 'APPROVE' | 'REJECT', note: string | null }} input
     */
    async decide(who, propertyId, input) {
      const { raw: p } = await deps.properties.viewById(propertyId);
      if (!p.pendingRevision) throw new NotFoundError('REVISION_NOT_FOUND');
      if (deps.isOwnOrg && (await deps.isOwnOrg(who.staffId, p.hotelOrgId))) throw new ForbiddenError('LISTING_OWN_ORGANISATION');
      if (p.pendingRevision.revisionId !== input.revisionId) throw new ConflictError('REVISION_CHANGED'); // more edits arrived — look again
      if (input.decision === 'REJECT' && !input.note) throw new DomainError('REVISION_NOTE_REQUIRED');
      const by = `staff:${who.staffId}`;
      const now = deps.clock.now();
      const fields = Object.keys(p.pendingRevision.changes);
      const base = { orgId: p.hotelOrgId, propertyId: String(p._id), publicRef: p.publicRef, name: p.name, fields };
      const approve = input.decision === 'APPROVE';
      const events = [newEvent(EVENTS.revisionDecided, { ...base, decision: approve ? 'APPROVED' : 'REJECTED' }, deps)];
      if (approve) events.push(newEvent(EVENTS.propertyUpdated, base, deps));
      const res = await PropertyRecord.updateOne(
        { _id: p._id, hotelOrgId: p.hotelOrgId, 'pendingRevision.revisionId': input.revisionId },
        {
          $set: { ...(approve ? p.pendingRevision.changes : {}), pendingRevision: null, updatedBy: by, hasPendingEvents: true },
          $inc: { version: 1 },
          $push: {
            history: { at: now, action: approve ? 'revision-approved' : 'revision-rejected', status: p.status, by, note: input.note },
            pendingEvents: { $each: events },
          },
        },
      ).setOptions(ADMIN);
      if (res.modifiedCount !== 1) throw new ConflictError('REVISION_CHANGED');
      return (await deps.properties.viewById(propertyId)).view;
    },
  };
}
