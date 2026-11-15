// @ts-check
/**
 * Master lists (plan Stage 03 §3.1). Everyone in the business area reads the active entries (hotel wizard,
 * later website filters); MusafirBaba admins add, rename, reorder and switch entries off — never delete.
 * `seedMasters` loads the starter lists at background start: repeat-safe and only adds what is missing.
 */
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { SEED_AMENITIES, SEED_BED_TYPES, SEED_CITIES, SEED_MEAL_PLANS, SEED_PROPERTY_TYPES } from './domain/masters-seed.js';
import { isInIndia, slugify } from './domain/slug.js';
import { AmenityRecord, BedTypeRecord, CityRecord, MealPlanRecord, PropertyTypeRecord } from './models/masters.model.js';

const ID = /^[a-f0-9]{24}$/;

/** Kinds identified by a key (cities are separate: they have areas and a centre). */
export const KEYED_MASTERS = /** @type {const} */ ({
  amenities: AmenityRecord,
  'property-types': PropertyTypeRecord,
  'bed-types': BedTypeRecord,
  'meal-plans': MealPlanRecord,
});
/** @typedef {keyof typeof KEYED_MASTERS} KeyedKind */

/** @param {any} d */
const keyedDto = (d) => ({
  id: String(d._id),
  key: d.key,
  name: d.name,
  order: d.order,
  active: d.active,
  ...(d.level !== undefined ? { level: d.level, group: d.group, icon: d.icon ?? null } : {}),
  ...(d.code !== undefined ? { code: d.code, description: d.description ?? null } : {}),
});
/** @param {any} c */
const cityDto = (c) => ({
  id: String(c._id),
  name: c.name,
  slug: c.slug,
  stateCode: c.stateCode,
  lat: c.location.coordinates[1],
  lng: c.location.coordinates[0],
  radiusKm: c.radiusKm,
  order: c.order,
  active: c.active,
  areas: (c.areas ?? []).map((/** @type {any} */ a) => ({ id: String(a._id), name: a.name, slug: a.slug, active: a.active })),
});

/** @param {unknown} error @param {string} code */
const duplicate = (error, code) => {
  if (/** @type {{ code?: number }} */ (error).code === 11000) throw new ConflictError(code);
  throw error;
};

/** @param {number} lat @param {number} lng */
function assertIndia(lat, lng) {
  if (!isInIndia(lat, lng)) throw new DomainError('LOCATION_OUTSIDE_INDIA');
}

/**
 * Adds the missing starter entries (never changes existing ones). Repeat-safe; returns how many were added.
 * @returns {Promise<number>}
 */
export async function seedMasters() {
  /** @type {[import('mongoose').Model<any>, string, Record<string, unknown>[]][]} */
  const sets = [
    [AmenityRecord, 'key', SEED_AMENITIES.map(([key, name, level, group, icon], i) => ({ key, name, level, group, icon, order: i * 10 }))],
    [PropertyTypeRecord, 'key', SEED_PROPERTY_TYPES.map(([key, name], i) => ({ key, name, order: i * 10 }))],
    [BedTypeRecord, 'key', SEED_BED_TYPES.map(([key, name], i) => ({ key, name, order: i * 10 }))],
    [MealPlanRecord, 'key', SEED_MEAL_PLANS.map(([key, code, name, description], i) => ({ key, code, name, description, order: i * 10 }))],
    [
      CityRecord,
      'slug',
      SEED_CITIES.map(([name, slug, stateCode, lat, lng, radiusKm], i) => ({
        name,
        slug,
        stateCode,
        location: { type: 'Point', coordinates: [lng, lat] },
        radiusKm,
        order: i * 10,
      })),
    ],
  ];
  let added = 0;
  for (const [model, field, docs] of sets) {
    const res = await model.bulkWrite(
      docs.map((doc) => ({ updateOne: { filter: { [field]: doc[field] }, update: { $setOnInsert: doc }, upsert: true } })),
      { ordered: false },
    );
    added += res.upsertedCount;
  }
  return added;
}

/** Reads for everyone, changes for MusafirBaba admins. */
export function createMastersService() {
  return {
    /** @param {{ includeInactive?: boolean }} [opts] */
    async list(opts = {}) {
      const filter = opts.includeInactive ? {} : { active: true };
      const sort = /** @type {const} */ ({ order: 1, name: 1 });
      const [cities, amenities, propertyTypes, bedTypes, mealPlans] = await Promise.all([
        CityRecord.find(filter).sort(sort).lean(),
        AmenityRecord.find(filter).sort(sort).lean(),
        PropertyTypeRecord.find(filter).sort(sort).lean(),
        BedTypeRecord.find(filter).sort(sort).lean(),
        MealPlanRecord.find(filter).sort(sort).lean(),
      ]);
      const cityList = cities.map(cityDto);
      return {
        cities: opts.includeInactive
          ? cityList
          : cityList.map((c) => ({ ...c, areas: c.areas.filter((/** @type {{ active: boolean }} */ a) => a.active) })),
        amenities: amenities.map(keyedDto),
        propertyTypes: propertyTypes.map(keyedDto),
        bedTypes: bedTypes.map(keyedDto),
        mealPlans: mealPlans.map(keyedDto),
      };
    },

    /** @param {string} id */
    async city(id) {
      const c = ID.test(id) ? await CityRecord.findById(id).lean() : null;
      return c ? cityDto(c) : null;
    },

    /** @param {KeyedKind} kind @param {Record<string, unknown> & { key: string }} input @param {string} by */
    async create(kind, input, by) {
      const doc = await KEYED_MASTERS[kind].create({ ...input, updatedBy: by }).catch((e) => duplicate(e, 'MASTER_KEY_TAKEN'));
      return keyedDto(doc.toObject());
    },

    /** The key never changes (listings refer to it). @param {KeyedKind} kind @param {string} id @param {Record<string, unknown>} patch @param {string} by */
    async update(kind, id, patch, by) {
      const doc = ID.test(id)
        ? await KEYED_MASTERS[kind].findByIdAndUpdate(id, { $set: { ...patch, updatedBy: by } }, { new: true }).lean()
        : null;
      if (!doc) throw new NotFoundError('MASTER_NOT_FOUND');
      return keyedDto(doc);
    },

    ...cityFunctions(),
  };
}

function cityFunctions() {
  return {
    /** @param {{ name: string, stateCode: string, lat: number, lng: number, radiusKm: number, order?: number }} input @param {string} by */
    async createCity(input, by) {
      assertIndia(input.lat, input.lng);
      const doc = await CityRecord.create({
        name: input.name,
        slug: slugify(input.name),
        stateCode: input.stateCode,
        location: { type: 'Point', coordinates: [input.lng, input.lat] },
        radiusKm: input.radiusKm,
        order: input.order ?? 100,
        updatedBy: by,
      }).catch((e) => duplicate(e, 'CITY_EXISTS'));
      return cityDto(doc.toObject());
    },

    /**
     * @param {string} id
     * @param {{ name?: string, stateCode?: string, lat?: number, lng?: number, radiusKm?: number, order?: number, active?: boolean }} patch
     * @param {string} by
     */
    async updateCity(id, patch, by) {
      const current = /** @type {any} */ (ID.test(id) ? await CityRecord.findById(id).lean() : null);
      if (!current) throw new NotFoundError('CITY_NOT_FOUND');
      const { lat, lng, ...rest } = patch;
      /** @type {Record<string, unknown>} */
      const set = { ...rest, updatedBy: by };
      if (lat !== undefined || lng !== undefined) {
        const next = [lng ?? current.location.coordinates[0], lat ?? current.location.coordinates[1]];
        assertIndia(/** @type {number} */ (next[1]), /** @type {number} */ (next[0]));
        set.location = { type: 'Point', coordinates: next };
      }
      const doc = await CityRecord.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
      return cityDto(doc);
    },

    /** @param {string} cityId @param {{ name: string }} input @param {string} by */
    async addArea(cityId, input, by) {
      const slug = slugify(input.name);
      const res = ID.test(cityId)
        ? await CityRecord.updateOne(
            { _id: cityId, 'areas.slug': { $ne: slug } },
            { $push: { areas: { name: input.name, slug, active: true } }, $set: { updatedBy: by } },
          )
        : null;
      if (!res || res.matchedCount !== 1) {
        if (ID.test(cityId) && (await CityRecord.exists({ _id: cityId }))) throw new ConflictError('AREA_EXISTS');
        throw new NotFoundError('CITY_NOT_FOUND');
      }
      return this.cityOrThrow(cityId);
    },

    /** @param {string} cityId @param {string} areaId @param {{ name?: string, active?: boolean }} patch @param {string} by */
    async updateArea(cityId, areaId, patch, by) {
      /** @type {Record<string, unknown>} */
      const set = { updatedBy: by };
      if (patch.name !== undefined) set['areas.$.name'] = patch.name;
      if (patch.active !== undefined) set['areas.$.active'] = patch.active;
      const res =
        ID.test(cityId) && ID.test(areaId) ? await CityRecord.updateOne({ _id: cityId, 'areas._id': areaId }, { $set: set }) : null;
      if (!res || res.matchedCount !== 1) throw new NotFoundError('AREA_NOT_FOUND');
      return this.cityOrThrow(cityId);
    },

    /** @param {string} id */
    async cityOrThrow(id) {
      const c = await CityRecord.findById(id).lean();
      if (!c) throw new NotFoundError('CITY_NOT_FOUND');
      return cityDto(c);
    },
  };
}
