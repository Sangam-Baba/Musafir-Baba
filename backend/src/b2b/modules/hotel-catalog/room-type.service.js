// @ts-check
/**
 * Room types of a property (plan Stage 03 §3.3). Every call goes through the property first, so the same
 * limits apply (another org's or an unassigned property → 404). Changes only while the property can be
 * edited (draft or changes requested; live edits come with S03-T07), each on the version the screen loaded.
 * A room type can be deleted while the property is still being prepared (nothing refers to it yet).
 */
import { newEvent } from '../../core/db/events.js';
import { AppError, ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { EDITABLE_STATUSES } from './domain/property.js';
import { LIVE_STATUSES } from './domain/revisions.js';
import { assertOccupancy, MAX_ROOM_TYPES_PER_PROPERTY, nameKey } from './domain/room-type.js';
import { EVENTS } from './events.js';
import { AmenityRecord, BedTypeRecord } from './models/masters.model.js';
import { RoomTypeRecord } from './models/room-type.model.js';
import { PERMISSIONS } from './permissions.js';

const ID = /^[a-f0-9]{24}$/;

/**
 * @typedef {{ name: string, description: string, sizeSqm: number | null, beds: { bedTypeKey: string, count: number }[],
 *   maxAdults: number, maxChildren: number, maxOccupancy: number, extraBeds: { allowed: boolean, max: number },
 *   amenities: string[], order?: number }} RoomTypeInput
 */

/** @param {any} r */
const toDto = (r) => ({
  id: String(r._id),
  propertyId: r.propertyId,
  name: r.name,
  description: r.description,
  sizeSqm: r.sizeSqm,
  beds: r.beds,
  maxAdults: r.maxAdults,
  maxChildren: r.maxChildren,
  maxOccupancy: r.maxOccupancy,
  extraBeds: { allowed: r.extraBeds?.allowed ?? false, max: r.extraBeds?.max ?? 0 },
  amenities: r.amenities,
  order: r.order,
  status: r.status,
  version: r.version,
});

/** Occupancy rules plus the master lists (active bed types, room-level amenities). @param {RoomTypeInput} input */
async function checkInput(input) {
  assertOccupancy(input);
  const bedKeys = [...new Set(input.beds.map((b) => b.bedTypeKey))];
  if ((await BedTypeRecord.countDocuments({ key: { $in: bedKeys }, active: true })) !== bedKeys.length)
    throw new DomainError('BED_TYPE_UNKNOWN');
  const amenities = [...new Set(input.amenities)];
  const known = await AmenityRecord.countDocuments({ key: { $in: amenities }, active: true, level: { $in: ['ROOM', 'BOTH'] } });
  if (known !== amenities.length) throw new DomainError('AMENITY_UNKNOWN');
  return { ...input, amenities, nameKey: nameKey(input.name) };
}

/** @param {unknown} error */
const nameTaken = (error) => {
  if (/** @type {{ code?: number }} */ (error).code === 11000) throw new ConflictError('ROOM_TYPE_NAME_TAKEN');
  throw error;
};

/** @param {any} property */
function assertEditable(property) {
  const ok = [...EDITABLE_STATUSES, ...LIVE_STATUSES];
  if (!(/** @type {readonly string[]} */ (ok).includes(property.status)))
    throw new DomainError('PROPERTY_NOT_EDITABLE', { status: property.status });
}

/**
 * On a live listing a room type change is published at once: `property.updated` stored with the change.
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @param {any} p
 * @returns {Record<string, unknown>}
 */
function liveEventFields(deps, p) {
  if (!(/** @type {readonly string[]} */ (LIVE_STATUSES).includes(p.status))) return {};
  const event = newEvent(
    EVENTS.propertyUpdated,
    { orgId: p.hotelOrgId, propertyId: String(p._id), publicRef: p.publicRef, fields: ['roomTypes'] },
    deps,
  );
  return { hasPendingEvents: true, pendingEvents: [event] };
}

/**
 * Deleted while the property was never published; archived afterwards — never the last one of a live listing.
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @param {any} p
 * @param {any} r
 */
async function removeRoomType(deps, p, r) {
  if (!p.publishedAt) return void (await RoomTypeRecord.deleteOne({ _id: r._id, hotelOrgId: p.hotelOrgId }));
  if ((await RoomTypeRecord.countDocuments({ hotelOrgId: p.hotelOrgId, propertyId: String(p._id), status: 'ACTIVE' })) <= 1)
    throw new DomainError('LAST_ROOM_TYPE');
  const { pendingEvents, ...flags } = liveEventFields(deps, p);
  await RoomTypeRecord.updateOne(
    { _id: r._id, hotelOrgId: p.hotelOrgId, status: 'ACTIVE' },
    { $set: { status: 'ARCHIVED', ...flags }, ...(pendingEvents ? { $push: { pendingEvents: { $each: pendingEvents } } } : {}) },
  );
}

/**
 * @param {{ clock: import('../../core/clock.js').Clock,
 *   properties: { loadOwned: (ctx: import('../../core/context.js').RequestContext, id: string, permission: string) => Promise<any> } }} deps
 */
export function createRoomTypeService(deps) {
  /** @param {import('../../core/context.js').RequestContext} ctx @param {string} propertyId @param {string} id */
  async function loadOne(ctx, propertyId, id) {
    const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.propertyManage);
    const r = ID.test(id) ? await RoomTypeRecord.findOne({ _id: id, hotelOrgId: p.hotelOrgId, propertyId }).lean() : null;
    if (!r) throw new NotFoundError('ROOM_TYPE_NOT_FOUND');
    return { p, r };
  }

  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} propertyId */
    async list(ctx, propertyId) {
      const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.propertyRead);
      const docs = await RoomTypeRecord.find({ hotelOrgId: p.hotelOrgId, propertyId, status: 'ACTIVE' })
        .sort({ order: 1, createdAt: 1 })
        .lean();
      return docs.map(toDto);
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} propertyId @param {RoomTypeInput} input */
    async create(ctx, propertyId, input) {
      const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.propertyManage);
      assertEditable(p);
      if ((await RoomTypeRecord.countDocuments({ hotelOrgId: p.hotelOrgId, propertyId, status: 'ACTIVE' })) >= MAX_ROOM_TYPES_PER_PROPERTY)
        throw new DomainError('TOO_MANY_ROOM_TYPES');
      const by = ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system';
      const doc = await RoomTypeRecord.create({
        ...(await checkInput(input)),
        hotelOrgId: p.hotelOrgId,
        propertyId,
        createdBy: by,
        updatedBy: by,
        ...liveEventFields(deps, p),
      }).catch(nameTaken);
      return toDto(doc.toObject());
    },

    /**
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {{ propertyId: string, id: string, data: RoomTypeInput, version: number }} input
     */
    async update(ctx, input) {
      const { p, r } = await loadOne(ctx, input.propertyId, input.id);
      assertEditable(p);
      const set = { ...(await checkInput(input.data)), updatedBy: ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system' };
      const { pendingEvents, ...flags } = liveEventFields(deps, p);
      const res = await RoomTypeRecord.updateOne(
        { _id: r._id, hotelOrgId: p.hotelOrgId, version: input.version },
        {
          $set: { ...set, ...flags },
          $inc: { version: 1 },
          ...(pendingEvents ? { $push: { pendingEvents: { $each: pendingEvents } } } : {}),
        },
      ).catch(nameTaken);
      if (res.modifiedCount !== 1)
        throw new AppError('VERSION_CONFLICT', 412, 'The room type was changed meanwhile — reload and try again');
      return toDto(await RoomTypeRecord.findOne({ _id: r._id, hotelOrgId: p.hotelOrgId }).lean());
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} propertyId @param {string} id */
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} propertyId @param {string} id */
    async remove(ctx, propertyId, id) {
      const { p, r } = await loadOne(ctx, propertyId, id);
      assertEditable(p);
      await removeRoomType(deps, p, r);
    },
  };
}
