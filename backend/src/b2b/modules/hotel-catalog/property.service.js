// @ts-check
/**
 * Properties of a hotel org (plan Stage 03 §3.2, §6). Hotel members see their org's properties — or, when
 * limited to some properties, only those (other properties: 404). Creating needs access to the whole org
 * (a Manager limited to some properties couldn't see a new one). Each wizard section is saved on its own,
 * only on the version the screen loaded (412 VERSION_CONFLICT otherwise). The property's GSTIN is the
 * business's verified GSTIN for the property's state (D33); a GST-registered business without one is told.
 */
import { AppError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { newReference } from '../../core/ids.js';
import { authz } from '../access/index.js';
import { assertPinInCity, EDITABLE_STATUSES, sectionsDone } from './domain/property.js';
import { slugify } from './domain/slug.js';
import { AmenityRecord, CityRecord, PropertyTypeRecord } from './models/masters.model.js';
import { PropertyRecord } from './models/property.model.js';
import { PERMISSIONS } from './permissions.js';

const ID = /^[a-f0-9]{24}$/;

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock,
 *   gstStatus?: (orgId: string) => Promise<{ registered: boolean, verified: { stateCode: string, gstin: string }[] }> }} PropertyDeps
 */

/** @param {import('../../core/context.js').RequestContext} ctx */
function memberOf(ctx) {
  if (ctx.actor.type !== 'member') throw new ForbiddenError('ORG_NOT_SELECTED');
  return ctx.actor;
}

/**
 * @param {any} p
 * @param {{ registered: boolean, verified: { stateCode: string, gstin: string }[] }} gst
 */
function toDto(p, gst) {
  const gstin = p.stateCode ? (gst.verified.find((g) => g.stateCode === p.stateCode)?.gstin ?? null) : null;
  return {
    ...identity(p),
    ...content(p),
    gstin,
    gstinMissing: Boolean(gst.registered && p.stateCode && !gstin),
    sections: sectionsDone(p),
  };
}

/** @param {any} p */
const identity = (p) => ({
  id: String(p._id),
  publicRef: p.publicRef,
  slug: p.slug,
  status: p.status,
  version: p.version,
  updatedAt: p.updatedAt,
});

/** @param {any} p */
function content(p) {
  return {
    name: p.name,
    propertyTypeKey: p.propertyTypeKey,
    starRating: p.starRating,
    description: p.description,
    cityId: p.cityId,
    areaId: p.areaId,
    stateCode: p.stateCode,
    address: p.address ?? { line1: null, line2: null, pin: null },
    lat: p.location?.coordinates?.[1] ?? null,
    lng: p.location?.coordinates?.[0] ?? null,
    contacts: p.contacts ?? { email: null, phone: null, whatsapp: null },
    checkInTime: p.checkInTime,
    checkOutTime: p.checkOutTime,
    timeZone: p.timeZone,
    policies: p.policies ?? null,
    amenities: p.amenities ?? [],
  };
}

/** @param {any} p */
const ownership = (p) => ({ orgId: p.hotelOrgId, propertyId: String(p._id) });

/**
 * Checks a section's data against the master lists; returns what to store.
 * @param {import('./domain/property.js').Section} section
 * @param {Record<string, any>} data
 */
async function prepareSection(section, data) {
  if (section === 'basic') {
    if (!(await PropertyTypeRecord.exists({ key: data.propertyTypeKey, active: true }))) throw new DomainError('PROPERTY_TYPE_UNKNOWN');
    return data;
  }
  if (section === 'location') return prepareLocation(data);
  if (section === 'amenities') {
    const known = await AmenityRecord.find(
      { key: { $in: data.amenities }, active: true, level: { $in: ['PROPERTY', 'BOTH'] } },
      { key: 1 },
    ).lean();
    if (known.length !== new Set(data.amenities).size) throw new DomainError('AMENITY_UNKNOWN');
    return { amenities: [...new Set(data.amenities)] };
  }
  if (section === 'policies') return { policies: data };
  return section === 'contacts' ? { contacts: { email: data.email, phone: data.phone, whatsapp: data.whatsapp ?? null } } : data;
}

/** @param {Record<string, any>} data */
async function prepareLocation(data) {
  const city = /** @type {any} */ (ID.test(data.cityId) ? await CityRecord.findOne({ _id: data.cityId, active: true }).lean() : null);
  if (!city) throw new DomainError('CITY_UNKNOWN');
  if (data.areaId && !city.areas.some((/** @type {any} */ a) => String(a._id) === data.areaId && a.active))
    throw new DomainError('AREA_UNKNOWN');
  const [lng, lat] = city.location.coordinates;
  assertPinInCity({ lat: data.lat, lng: data.lng }, { lat, lng, radiusKm: city.radiusKm, name: city.name });
  return {
    cityId: data.cityId,
    areaId: data.areaId ?? null,
    stateCode: city.stateCode,
    address: { line1: data.line1, line2: data.line2 ?? null, pin: data.pin },
    location: { type: 'Point', coordinates: [data.lng, data.lat] },
  };
}

/** @param {PropertyDeps} deps */
export function createPropertyService(deps) {
  /** @param {string} orgId */
  const gstOf = async (orgId) => (deps.gstStatus ? deps.gstStatus(orgId) : { registered: false, verified: [] });

  /** @param {import('../../core/context.js').RequestContext} ctx @param {string} id @param {string} permission */
  async function load(ctx, id, permission) {
    const a = memberOf(ctx);
    const p = ID.test(id) ? await PropertyRecord.findOne({ _id: id, hotelOrgId: a.orgId }).lean() : null;
    if (!p) throw new NotFoundError('PROPERTY_NOT_FOUND');
    authz.assert(ctx, permission, ownership(p));
    return /** @type {any} */ (p);
  }

  return {
    /** The stored property after the access checks (for room types, photos). */
    loadOwned: load,

    /** @param {import('../../core/context.js').RequestContext} ctx */
    async list(ctx) {
      const a = memberOf(ctx);
      const docs = await PropertyRecord.find(authz.scopeFilter(ctx, { orgField: 'hotelOrgId', propertyField: '_id' }))
        .sort({ createdAt: -1 })
        .lean();
      const gst = await gstOf(a.orgId);
      return docs.map((p) => toDto(p, gst));
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} id */
    async get(ctx, id) {
      const p = await load(ctx, id, PERMISSIONS.propertyRead);
      return toDto(p, await gstOf(p.hotelOrgId));
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {{ name: string, propertyTypeKey: string }} input */
    async create(ctx, input) {
      const a = memberOf(ctx);
      authz.assert(ctx, PERMISSIONS.propertyManage, { orgId: a.orgId });
      if (a.orgType !== 'HOTEL') throw new ForbiddenError('HOTEL_ORG_REQUIRED');
      if (a.propertyIds?.length) throw new ForbiddenError('PROPERTY_LIMITED_CANNOT_CREATE');
      await prepareSection('basic', input);
      const publicRef = newReference('MBHT');
      const by = `user:${a.userId}`;
      const doc = await PropertyRecord.create({
        hotelOrgId: a.orgId,
        publicRef,
        slug: `${slugify(input.name) || 'hotel'}-${publicRef.slice(-6).toLowerCase()}`,
        name: input.name,
        propertyTypeKey: input.propertyTypeKey,
        createdBy: by,
        updatedBy: by,
      });
      return toDto(doc.toObject(), await gstOf(a.orgId));
    },

    /**
     * Saves one wizard section, only on the version the screen loaded.
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {{ id: string, section: import('./domain/property.js').Section, data: Record<string, any>, version: number }} input
     */
    async saveSection(ctx, input) {
      const p = await load(ctx, input.id, PERMISSIONS.propertyManage);
      if (!(/** @type {readonly string[]} */ (EDITABLE_STATUSES).includes(p.status)))
        throw new DomainError('PROPERTY_NOT_EDITABLE', { status: p.status });
      const set = await prepareSection(input.section, input.data);
      const res = await PropertyRecord.updateOne(
        { _id: p._id, hotelOrgId: p.hotelOrgId, version: input.version, status: { $in: EDITABLE_STATUSES } },
        { $set: { ...set, updatedBy: `user:${memberOf(ctx).userId}` }, $inc: { version: 1 } },
      );
      if (res.modifiedCount !== 1) throw new AppError('VERSION_CONFLICT', 412, 'The property was changed meanwhile — reload and try again');
      return toDto(await PropertyRecord.findOne({ _id: p._id, hotelOrgId: p.hotelOrgId }).lean(), await gstOf(p.hotelOrgId));
    },
  };
}
