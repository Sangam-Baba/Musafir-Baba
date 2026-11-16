// @ts-check
/**
 * The hotel's side of the listing workflow (plan Stage 03 §3.5): what still stops a submit, submit / resubmit,
 * and withdraw (back to draft before MusafirBaba looks at it). Submitting needs a verified business, every
 * wizard section, the GSTIN for the property's state (D33), at least one room type and enough photos — all
 * missing items are reported at once. Each step is one conditional update on the version the screen showed,
 * recording the step in `history` and, for submit, `hotel-catalog.property.submitted` in the same update.
 */
import { newEvent } from '../../core/db/events.js';
import { AppError, DomainError } from '../../core/errors.js';
import { listingTransition, submitBlockers } from './domain/listing-workflow.js';
import { EVENTS } from './events.js';
import { PropertyRecord } from './models/property.model.js';
import { RoomTypeRecord } from './models/room-type.model.js';
import { PERMISSIONS } from './permissions.js';

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock,
 *   properties: ReturnType<typeof import('./property.service.js').createPropertyService>,
 *   orgStatus: (orgId: string) => Promise<string | null> }} ListingDeps
 */

/** @param {import('../../core/context.js').RequestContext} ctx */
const actorRef = (ctx) => (ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system');

/** @param {ListingDeps} deps */
export function createListingService(deps) {
  /** @param {import('../../core/context.js').RequestContext} ctx @param {string} id */
  async function readiness(ctx, id) {
    const view = await deps.properties.get(ctx, id);
    const raw = await deps.properties.loadOwned(ctx, id, PERMISSIONS.propertyRead);
    const roomTypes = await RoomTypeRecord.find({ hotelOrgId: raw.hotelOrgId, propertyId: id, status: 'ACTIVE' }, { name: 1 }).lean();
    const businessVerified = (await deps.orgStatus(raw.hotelOrgId)) === 'ACTIVE';
    const blockers = submitBlockers(
      view,
      roomTypes.map((r) => ({ id: String(r._id), name: r.name })),
      { businessVerified },
    );
    return { property: view, raw, blockers, ready: blockers.length === 0 };
  }

  /**
   * @param {import('../../core/context.js').RequestContext} ctx
   * @param {any} raw
   * @param {{ action: 'submit' | 'resubmit' | 'withdraw', version: number, event?: string }} step
   */
  async function move(ctx, raw, step) {
    const status = listingTransition(raw.status, step.action);
    const now = deps.clock.now();
    /** @type {Record<string, unknown>} */
    const set = { status, updatedBy: actorRef(ctx) };
    /** @type {Record<string, unknown>} */
    const push = { history: { at: now, action: step.action, status, by: actorRef(ctx), note: null } };
    /** @type {Record<string, number>} */
    const inc = { version: 1 };
    if (step.event) {
      inc.round = 1;
      set.submittedAt = now;
      set.hasPendingEvents = true;
      push.pendingEvents = newEvent(
        step.event,
        { orgId: raw.hotelOrgId, propertyId: String(raw._id), publicRef: raw.publicRef, round: (raw.round ?? 0) + 1 },
        deps,
      );
    }
    const res = await PropertyRecord.updateOne(
      { _id: raw._id, hotelOrgId: raw.hotelOrgId, status: raw.status, version: step.version },
      { $set: set, $inc: inc, $push: push },
    );
    if (res.modifiedCount !== 1) throw new AppError('VERSION_CONFLICT', 412, 'The property was changed meanwhile — reload and try again');
    return deps.properties.get(ctx, String(raw._id));
  }

  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} id */
    async readiness(ctx, id) {
      const { blockers, ready } = await readiness(ctx, id);
      return { ready, blockers };
    },

    /** Submit (first time) or resubmit (after changes were requested). @param {import('../../core/context.js').RequestContext} ctx @param {string} id @param {number} version */
    async submit(ctx, id, version) {
      await deps.properties.loadOwned(ctx, id, PERMISSIONS.propertyManage);
      const { raw, blockers } = await readiness(ctx, id);
      if (raw.status !== 'DRAFT' && raw.status !== 'CHANGES_REQUESTED')
        throw new DomainError('LISTING_TRANSITION_NOT_ALLOWED', { from: raw.status, action: 'submit' });
      if (blockers.length > 0) throw new DomainError('PROPERTY_NOT_READY', { blockers });
      return move(ctx, raw, { action: raw.status === 'DRAFT' ? 'submit' : 'resubmit', version, event: EVENTS.propertySubmitted });
    },

    /** Back to draft before MusafirBaba decides. @param {import('../../core/context.js').RequestContext} ctx @param {string} id @param {number} version */
    async withdraw(ctx, id, version) {
      const raw = await deps.properties.loadOwned(ctx, id, PERMISSIONS.propertyManage);
      return move(ctx, raw, { action: 'withdraw', version });
    },
  };
}
