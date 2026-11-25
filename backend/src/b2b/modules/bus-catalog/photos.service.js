// @ts-check
/**
 * Photos of a bus (plan Stage 18 B8, DEF-043): outside, inside, seats. The browser sends every size; each is checked
 * (the photo check is passed in — the same rules as hotel photos: type from the bytes, real size, no camera / location
 * data), stored in the public folder `b2b-public/buses/<company ref>/<photo id>-<size>.<ext>`, then recorded on the bus.
 * Files are stored before the record and removed again if the record can't be written. Up to 20 photos; not on a
 * retired bus. Photos don't send an approved bus back for review (staff see them in the review queue).
 */
import { b2bMongoose } from '../../core/db/connection.js';
import { DomainError, NotFoundError } from '../../core/errors.js';
import { VehicleRecord } from './models/vehicle.model.js';

export const MAX_BUS_PHOTOS = 20;
export const BUS_PHOTO_CATEGORIES = /** @type {const} */ (['OUTSIDE', 'INSIDE', 'SEATS', 'OTHER']);

/**
 * @typedef {{ store: import('../files/public-storage.js').PublicStore, clock: import('../../core/clock.js').Clock,
 *   checkPhoto: (files: Record<string, Buffer>) => Record<string, { width: number, height: number, type: string }>,
 *   checkPlaceholder: (dataUrl: string) => string }} BusPhotoDeps
 */

/** @param {string} orgId @param {string} id */
async function own(orgId, id) {
  const v = /^[a-f0-9]{24}$/.test(id) ? await VehicleRecord.findOne({ _id: id, operatorOrgId: orgId }).lean() : null;
  if (!v) throw new NotFoundError('BUS_NOT_FOUND');
  return /** @type {Record<string, any>} */ (v);
}

/** @param {BusPhotoDeps} deps */
export function createBusPhotos(deps) {
  /** @param {string[]} keys */
  const removeFiles = async (keys) => {
    for (const k of keys) await deps.store.remove(k).catch(() => undefined);
  };
  return {
    /**
     * @param {{ orgId: string, userId: string, orgRef: string }} who
     * @param {string} vehicleId
     * @param {{ files: Record<string, Buffer>, placeholder: string, category: typeof BUS_PHOTO_CATEGORIES[number], caption?: string | null }} input
     */
    async add(who, vehicleId, input) {
      const v = await own(who.orgId, vehicleId);
      if (v.status === 'RETIRED') throw new DomainError('BUS_NOT_EDITABLE');
      if ((v.photos ?? []).length >= MAX_BUS_PHOTOS) throw new DomainError('TOO_MANY_PHOTOS', { max: MAX_BUS_PHOTOS });
      const infos = deps.checkPhoto(input.files);
      const placeholder = deps.checkPlaceholder(input.placeholder);
      const photoId = new b2bMongoose.Types.ObjectId();
      /** @type {Record<string, { key: string, url: string, width: number, height: number, type: string }>} */
      const variants = {};
      for (const [name, info] of Object.entries(infos)) {
        const key = `b2b-public/buses/${who.orgRef}/${photoId.toHexString()}-${name}.${info.type === 'image/webp' ? 'webp' : 'jpg'}`;
        await deps.store.put(key, /** @type {Buffer} */ (input.files[name]), info.type);
        variants[name] = { key, url: deps.store.url(key), width: info.width, height: info.height, type: info.type };
      }
      const photo = {
        _id: photoId,
        category: input.category,
        caption: input.caption ?? null,
        order: (v.photos ?? []).length * 10,
        variants,
        placeholder,
        uploadedBy: `user:${who.userId}`,
        uploadedAt: deps.clock.now(),
      };
      const res = await VehicleRecord.updateOne(
        { _id: vehicleId, operatorOrgId: who.orgId, status: { $ne: 'RETIRED' }, [`photos.${MAX_BUS_PHOTOS - 1}`]: { $exists: false } },
        { $push: { photos: photo } },
      );
      if (res.modifiedCount !== 1) {
        await removeFiles(Object.values(variants).map((x) => x.key));
        throw new DomainError('BUS_NOT_EDITABLE');
      }
      return { id: photoId.toHexString() };
    },
    /** @param {{ orgId: string }} who @param {string} vehicleId @param {string} photoId */
    async remove(who, vehicleId, photoId) {
      const v = await own(who.orgId, vehicleId);
      const p = (v.photos ?? []).find((/** @type {any} */ x) => String(x._id) === photoId);
      if (!p) throw new NotFoundError('PHOTO_NOT_FOUND');
      await VehicleRecord.updateOne({ _id: vehicleId, operatorOrgId: who.orgId }, { $pull: { photos: { _id: p._id } } });
      await removeFiles(Object.values(p.variants ?? {}).map((/** @type {any} */ x) => x.key));
      return { removed: photoId };
    },
  };
}
