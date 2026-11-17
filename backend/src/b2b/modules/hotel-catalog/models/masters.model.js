// @ts-check
/**
 * Master lists (plan Stage 03 §3.1) — platform-wide (not owned by an org), managed by MusafirBaba admins:
 * `htl_cities` (with areas, a centre point and a radius for the "pin inside the city" check), `htl_amenities`,
 * `htl_property_types`, `htl_bed_types`, `htl_meal_plans`. Nothing is ever deleted — entries are switched off
 * (`active: false`), so listings that use them keep working.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const CITIES_COLLECTION = 'htl_cities';
export const AMENITIES_COLLECTION = 'htl_amenities';
export const PROPERTY_TYPES_COLLECTION = 'htl_property_types';
export const BED_TYPES_COLLECTION = 'htl_bed_types';
export const MEAL_PLANS_COLLECTION = 'htl_meal_plans';
export const AMENITY_LEVELS = /** @type {const} */ (['PROPERTY', 'ROOM', 'BOTH']);

const point = {
  type: { type: String, enum: ['Point'], required: true },
  coordinates: { type: [Number], required: true }, // [lng, lat]
};
const common = {
  name: { type: String, required: true, maxlength: 80 },
  order: { type: Number, default: 100 },
  active: { type: Boolean, default: true },
  updatedBy: { type: String, default: 'seed' },
};

const citySchema = new b2bMongoose.Schema(
  {
    ...common,
    slug: { type: String, required: true },
    stateCode: { type: String, required: true },
    location: point,
    radiusKm: { type: Number, required: true, min: 1, max: 200 },
    areas: {
      type: [
        new b2bMongoose.Schema(
          {
            name: { type: String, required: true, maxlength: 80 },
            slug: { type: String, required: true },
            active: { type: Boolean, default: true },
          },
          { _id: true },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true, versionKey: false },
);

/** @param {Record<string, unknown>} [extra] */
const keyedSchema = (extra = {}) =>
  new b2bMongoose.Schema({ key: { type: String, required: true }, ...common, ...extra }, { timestamps: true, versionKey: false });

export const CityRecord = defineModel('HotelCity', citySchema, CITIES_COLLECTION);
export const AmenityRecord = defineModel(
  'HotelAmenity',
  keyedSchema({
    level: { type: String, enum: AMENITY_LEVELS, required: true },
    group: { type: String, required: true, maxlength: 40 },
    icon: { type: String, default: null, maxlength: 40 },
  }),
  AMENITIES_COLLECTION,
);
export const PropertyTypeRecord = defineModel('HotelPropertyType', keyedSchema(), PROPERTY_TYPES_COLLECTION);
export const BedTypeRecord = defineModel('HotelBedType', keyedSchema(), BED_TYPES_COLLECTION);
export const MealPlanRecord = defineModel(
  'HotelMealPlan',
  keyedSchema({ code: { type: String, required: true, maxlength: 6 }, description: { type: String, default: null, maxlength: 200 } }),
  MEAL_PLANS_COLLECTION,
);
