// @ts-check
/**
 * Boarding / dropping points (plan Stage 18 B3): an operator adds its points in cities from the shared city list; a
 * point's city never changes (routes and searches depend on it) — add a new point instead.
 */
import { ConflictError, NotFoundError } from '../../core/errors.js';
import { StopRecord } from './models/stop.model.js';

/** @typedef {{ orgId: string, userId: string }} Operator */
/** @typedef {{ cityExists: (cityId: string) => Promise<boolean> }} StopDeps */
/** @typedef {{ name?: string, address?: string | null, landmark?: string | null, lat?: number | null, lng?: number | null }} StopFields */

/** @param {Record<string, any>} s */
export const stopDto = (s) => ({
  id: String(s._id),
  cityId: s.cityId,
  name: s.name,
  address: s.address,
  landmark: s.landmark,
  lat: s.lat,
  lng: s.lng,
  active: s.active,
  version: s.version,
});

/** @param {StopFields} f */
function fields(f) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of /** @type {const} */ (['name', 'address', 'landmark', 'lat', 'lng'])) if (f[k] !== undefined) out[k] = f[k];
  if (typeof out.name === 'string') out.name = out.name.trim();
  return out;
}

/** @param {StopDeps} deps */
export function createStops(deps) {
  return {
    /** @param {Operator} who @param {StopFields & { cityId: string }} a */
    async create(who, a) {
      if (!(await deps.cityExists(a.cityId))) throw new NotFoundError('CITY_NOT_FOUND');
      const s = await StopRecord.create({ operatorOrgId: who.orgId, cityId: a.cityId, ...fields(a) });
      return stopDto(s.toObject());
    },
    /** @param {Operator} who @param {string} id @param {StopFields & { active?: boolean, expectedVersion: number }} a */
    async update(who, id, a) {
      const set = { ...fields(a), ...(a.active === undefined ? {} : { active: a.active }) };
      const res = /^[a-f0-9]{24}$/.test(id)
        ? await StopRecord.updateOne({ _id: id, operatorOrgId: who.orgId, version: a.expectedVersion }, { $set: set, $inc: { version: 1 } })
        : { modifiedCount: 0 };
      if (res.modifiedCount !== 1) {
        if (!(await StopRecord.exists({ _id: id, operatorOrgId: who.orgId }))) throw new NotFoundError('STOP_NOT_FOUND');
        throw new ConflictError('VERSION_CONFLICT');
      }
      return stopDto(/** @type {any} */ (await StopRecord.findOne({ _id: id, operatorOrgId: who.orgId }).lean()));
    },
    /** @param {string} orgId */
    list: async (orgId) => (await StopRecord.find({ operatorOrgId: orgId }).sort({ name: 1 }).limit(2000).lean()).map(stopDto),
    /** Active stops of this operator by id (for routes). @param {string} orgId @param {string[]} ids */
    async activeByIds(orgId, ids) {
      const valid = ids.filter((x) => /^[a-f0-9]{24}$/.test(x));
      const list = await StopRecord.find({ _id: { $in: valid }, operatorOrgId: orgId, active: true }).lean();
      return new Map(list.map((s) => [String(s._id), stopDto(s)]));
    },
  };
}
