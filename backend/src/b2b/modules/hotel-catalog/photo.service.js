// @ts-check
/**
 * Photos of a property and of its room types (plan Stage 03 §3.4, D32). The browser sends every size of a photo;
 * each is checked (type from the bytes, real size, no camera / location data), stored in the public folder
 * (`b2b-public/hotels/<property ref>/…`, served from cdn.musafirbaba.com), then recorded on the property.
 * Bytes are stored before the record, and removed again if the record can't be written; a deleted photo's
 * files are removed after the record. Up to 60 property photos and 20 per room type; the first property photo
 * becomes the cover. Changes only while the property is editable (live edits: S03-T07).
 */
import { b2bMongoose } from '../../core/db/connection.js';
import { DomainError, NotFoundError } from '../../core/errors.js';
import { checkPhoto, checkPlaceholder } from './domain/photo-check.js';
import { EDITABLE_STATUSES } from './domain/property.js';
import { PropertyRecord } from './models/property.model.js';
import { RoomTypeRecord } from './models/room-type.model.js';
import { PERMISSIONS } from './permissions.js';

export const MAX_PROPERTY_PHOTOS = 60;
export const MAX_ROOM_PHOTOS = 20;
const ID = /^[a-f0-9]{24}$/;

/**
 * @typedef {{ properties: { loadOwned: (ctx: import('../../core/context.js').RequestContext, id: string, permission: string) => Promise<any> },
 *   store: import('../files/public-storage.js').PublicStore, logger?: import('../../core/logger.js').Logger,
 *   clock: import('../../core/clock.js').Clock }} PhotoDeps
 */
/**
 * @typedef {{ files: Partial<Record<import('./domain/photo-check.js').VariantName, Buffer>>, placeholder: string,
 *   category: typeof import('./models/property.model.js').PHOTO_CATEGORIES[number], caption: string | null, roomTypeId: string | null }} PhotoInput
 */

/** @param {any} p */
function assertEditable(p) {
  if (!(/** @type {readonly string[]} */ (EDITABLE_STATUSES).includes(p.status)))
    throw new DomainError('PROPERTY_NOT_EDITABLE', { status: p.status });
}

/** @param {PhotoDeps} deps @param {string[]} keys */
async function removeFiles(deps, keys) {
  for (const key of keys)
    await deps.store
      .remove(key)
      .catch((/** @type {unknown} */ error) => deps.logger?.warn({ err: error, key }, 'photos: file not removed'));
}

/** @param {any} p @param {string | null} roomTypeId */
async function assertRoomForPhoto(p, roomTypeId) {
  const count = (p.photos ?? []).filter((/** @type {any} */ x) => x.roomTypeId === roomTypeId).length;
  if (!roomTypeId) {
    if (count >= MAX_PROPERTY_PHOTOS) throw new DomainError('TOO_MANY_PHOTOS', { max: MAX_PROPERTY_PHOTOS });
    return;
  }
  if (
    !ID.test(roomTypeId) ||
    !(await RoomTypeRecord.exists({ _id: roomTypeId, hotelOrgId: p.hotelOrgId, propertyId: String(p._id), status: 'ACTIVE' }))
  )
    throw new NotFoundError('ROOM_TYPE_NOT_FOUND');
  if (count >= MAX_ROOM_PHOTOS) throw new DomainError('TOO_MANY_PHOTOS', { max: MAX_ROOM_PHOTOS });
}

/**
 * Checks and stores every size, then records the photo (files removed again if the record can't be written).
 * @param {PhotoDeps} deps
 * @param {import('../../core/context.js').RequestContext} ctx
 * @param {any} p the property (already checked: access, editable)
 * @param {PhotoInput} input
 */
async function addPhoto(deps, ctx, p, input) {
  await assertRoomForPhoto(p, input.roomTypeId);
  const infos = checkPhoto(input.files);
  const placeholder = checkPlaceholder(input.placeholder);
  const photoId = new b2bMongoose.Types.ObjectId();
  /** @type {Record<string, { key: string, width: number, height: number, type: string }>} */
  const variants = {};
  for (const [name, info] of Object.entries(infos)) {
    const key = `b2b-public/hotels/${p.publicRef}/${photoId.toHexString()}-${name}.${info.type === 'image/webp' ? 'webp' : 'jpg'}`;
    await deps.store.put(key, /** @type {Buffer} */ (input.files[/** @type {keyof PhotoInput['files']} */ (name)]), info.type);
    variants[name] = { key, width: info.width, height: info.height, type: info.type };
  }
  const isFirstCover = !input.roomTypeId && !(p.photos ?? []).some((/** @type {any} */ x) => !x.roomTypeId && x.isCover);
  const photo = {
    _id: photoId,
    roomTypeId: input.roomTypeId,
    category: input.category,
    caption: input.caption,
    order: (p.photos ?? []).length * 10,
    isCover: isFirstCover,
    variants,
    placeholder,
    uploadedBy: ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system',
    uploadedAt: deps.clock.now(),
  };
  const res = await PropertyRecord.updateOne(
    { _id: p._id, hotelOrgId: p.hotelOrgId, status: { $in: EDITABLE_STATUSES } },
    { $push: { photos: photo } },
  );
  if (res.modifiedCount !== 1) {
    await removeFiles(
      deps,
      Object.values(variants).map((v) => v.key),
    ); // the record wasn't written — don't leave files behind
    throw new DomainError('PROPERTY_NOT_EDITABLE');
  }
  return photoId.toHexString();
}

/** @param {PhotoDeps} deps */
export function createPhotoService(deps) {
  /** @param {import('../../core/context.js').RequestContext} ctx @param {string} propertyId */
  async function editable(ctx, propertyId) {
    const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.propertyManage);
    assertEditable(p);
    return p;
  }

  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} propertyId @param {PhotoInput} input */
    add: async (ctx, propertyId, input) => addPhoto(deps, ctx, await editable(ctx, propertyId), input),

    /**
     * Caption, category, order; `isCover` makes it the property's cover (only property photos).
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {{ propertyId: string, photoId: string, patch: { caption?: string | null, category?: string, order?: number, isCover?: true } }} input
     */
    async update(ctx, input) {
      const p = await editable(ctx, input.propertyId);
      const photo = (p.photos ?? []).find((/** @type {any} */ x) => String(x._id) === input.photoId);
      if (!photo) throw new NotFoundError('PHOTO_NOT_FOUND');
      if (input.patch.isCover && photo.roomTypeId) throw new DomainError('COVER_MUST_BE_PROPERTY_PHOTO');
      const { isCover, ...fields } = input.patch;
      /** @type {Record<string, unknown>} */
      const set = Object.fromEntries(Object.entries(fields).map(([k, v]) => [`photos.$.${k}`, v]));
      const filter = { _id: p._id, hotelOrgId: p.hotelOrgId };
      if (isCover) {
        await PropertyRecord.updateOne(
          filter,
          { $set: { 'photos.$[other].isCover': false } },
          { arrayFilters: [{ 'other.roomTypeId': null }] },
        );
        set['photos.$.isCover'] = true;
      }
      if (Object.keys(set).length > 0) await PropertyRecord.updateOne({ ...filter, 'photos._id': photo._id }, { $set: set });
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} propertyId @param {string} photoId */
    async remove(ctx, propertyId, photoId) {
      const p = await editable(ctx, propertyId);
      const photo = (p.photos ?? []).find((/** @type {any} */ x) => String(x._id) === photoId);
      if (!photo) throw new NotFoundError('PHOTO_NOT_FOUND');
      await PropertyRecord.updateOne({ _id: p._id, hotelOrgId: p.hotelOrgId }, { $pull: { photos: { _id: photo._id } } });
      await removeFiles(
        deps,
        Object.values(photo.variants).map((/** @type {any} */ v) => v.key),
      );
    },
  };
}
