// @ts-check
/**
 * Where a listing is sold (plan Stage 03 §3.6). The hotel switches the website / B2B channels and sets a
 * "sell from" date; MusafirBaba can also limit B2B to client categories. Published directly (not sensitive) —
 * on a live listing with `property.updated`. Only on the version the screen loaded; never on archived listings.
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { AppError, DomainError } from '../../core/errors.js';
import { LIVE_STATUSES } from './domain/revisions.js';
import { EVENTS } from './events.js';
import { PropertyRecord } from './models/property.model.js';
import { PERMISSIONS } from './permissions.js';

/** @typedef {{ website: boolean, b2b: boolean, sellFrom: string | null, clientCategories?: string[] }} VisibilityInput */

/**
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @param {{ p: any, input: VisibilityInput, version: number, by: string, admin: boolean }} a
 */
async function save(deps, { p, input, version, by, admin }) {
  if (p.status === 'ARCHIVED') throw new DomainError('PROPERTY_NOT_EDITABLE', { status: p.status });
  /** @type {Record<string, unknown>} */
  const set = { 'visibility.website': input.website, 'visibility.b2b': input.b2b, 'visibility.sellFrom': input.sellFrom, updatedBy: by };
  if (input.clientCategories) set['visibility.clientCategories'] = [...new Set(input.clientCategories)];
  const live = /** @type {readonly string[]} */ (LIVE_STATUSES).includes(p.status);
  const event = live
    ? newEvent(
        EVENTS.propertyUpdated,
        { orgId: p.hotelOrgId, propertyId: String(p._id), publicRef: p.publicRef, fields: ['visibility'] },
        deps,
      )
    : null;
  const res = await PropertyRecord.updateOne(
    { _id: p._id, hotelOrgId: p.hotelOrgId, version },
    {
      $set: { ...set, ...(event ? { hasPendingEvents: true } : {}) },
      $inc: { version: 1 },
      ...(event ? { $push: { pendingEvents: event } } : {}),
    },
  ).setOptions(admin ? systemScope('hotel-catalog: MusafirBaba sets visibility') : {});
  if (res.modifiedCount !== 1) throw new AppError('VERSION_CONFLICT', 412, 'The property was changed meanwhile — reload and try again');
}

/**
 * @param {{ clock: import('../../core/clock.js').Clock,
 *   properties: ReturnType<typeof import('./property.service.js').createPropertyService> }} deps
 */
export function createVisibilityService(deps) {
  return {
    /** Website / B2B and "sell from" (client categories are MusafirBaba's). @param {import('../../core/context.js').RequestContext} ctx @param {string} id @param {VisibilityInput} input @param {number} version */
    async setByHotel(ctx, id, input, version) {
      const p = await deps.properties.loadOwned(ctx, id, PERMISSIONS.propertyManage);
      const by = ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system';
      await save(deps, { p, input: { website: input.website, b2b: input.b2b, sellFrom: input.sellFrom }, version, by, admin: false });
      return deps.properties.get(ctx, id);
    },

    /** @param {{ staffId: string }} who @param {string} id @param {VisibilityInput} input @param {number} version */
    async setByAdmin(who, id, input, version) {
      const { raw } = await deps.properties.viewById(id);
      await save(deps, { p: raw, input, version, by: `staff:${who.staffId}`, admin: true });
      return (await deps.properties.viewById(id)).view;
    },
  };
}
