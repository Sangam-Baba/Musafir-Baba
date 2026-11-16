// @ts-check
/** Migrations from Stage 02 on (split from index.js to keep files short). Run after 0001–0017; ids never renamed or reused. */
import { FILE_ACCESS_COLLECTION, FILES_COLLECTION } from '../modules/files/index.js';
import {
  AMENITIES_COLLECTION,
  BED_TYPES_COLLECTION,
  CITIES_COLLECTION,
  MEAL_PLANS_COLLECTION,
  PROPERTY_TYPES_COLLECTION,
} from '../modules/hotel-catalog/index.js';
import { PROPERTIES_COLLECTION, ROOM_TYPES_COLLECTION } from '../modules/hotel-catalog/index.js';
import { APPLICATIONS_COLLECTION } from '../modules/kyc/index.js';
import { INBOX_COLLECTION as NTF_INBOX, PREFERENCES_COLLECTION as NTF_PREFERENCES } from '../modules/notifications/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_02_AND_LATER = [
  {
    id: '0018-file-files',
    description: 'Stored documents (encrypted bytes live in the file store): per org, newest first; storage key unique',
    up: async (ctx) => {
      await ctx.createCollection(FILES_COLLECTION);
      await ctx.createIndex(FILES_COLLECTION, { orgId: 1, createdAt: -1 }, { name: 'org_recent' });
      await ctx.createIndex(FILES_COLLECTION, { storageKey: 1 }, { name: 'storage_key_unique', unique: true });
    },
  },
  {
    id: '0019-file-access-log',
    description: 'Who opened which document: per org and file, newest first',
    up: async (ctx) => {
      await ctx.createCollection(FILE_ACCESS_COLLECTION);
      await ctx.createIndex(FILE_ACCESS_COLLECTION, { orgId: 1, fileId: 1, at: -1 }, { name: 'org_file_recent' });
    },
  },
  {
    id: '0020-kyc-applications',
    description: 'KYC applications: one per org; GSTIN lookup for duplicates; review queue by status; relay index',
    up: async (ctx) => {
      await ctx.createCollection(APPLICATIONS_COLLECTION);
      await ctx.createIndex(APPLICATIONS_COLLECTION, { orgId: 1 }, { name: 'org_unique', unique: true });
      await ctx.createIndex(
        APPLICATIONS_COLLECTION,
        { gstin: 1 },
        { name: 'gstin', partialFilterExpression: { gstin: { $type: 'string' } } },
      );
      await ctx.createIndex(APPLICATIONS_COLLECTION, { status: 1, submittedAt: 1 }, { name: 'queue' });
      await ctx.createIndex(
        APPLICATIONS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0021-notifications',
    description: 'Bell inbox (one row per event and recipient; newest first per recipient) and preferences per user and category',
    up: async (ctx) => {
      await ctx.createCollection(NTF_INBOX);
      await ctx.createIndex(NTF_INBOX, { eventId: 1, recipientId: 1 }, { name: 'event_recipient_unique', unique: true });
      await ctx.createIndex(NTF_INBOX, { recipientId: 1, _id: -1 }, { name: 'recipient_newest' });
      await ctx.createCollection(NTF_PREFERENCES);
      await ctx.createIndex(NTF_PREFERENCES, { userId: 1, category: 1 }, { name: 'user_category_unique', unique: true });
    },
  },
  {
    id: '0022-hotel-masters',
    description: 'Hotel master lists: cities (unique slug, map index), amenities, property types, bed types, meal plans (unique key)',
    up: async (ctx) => {
      await ctx.createCollection(CITIES_COLLECTION);
      await ctx.createIndex(CITIES_COLLECTION, { slug: 1 }, { name: 'slug_unique', unique: true });
      await ctx.createIndex(CITIES_COLLECTION, { location: '2dsphere' }, { name: 'location_geo' });
      for (const name of [AMENITIES_COLLECTION, PROPERTY_TYPES_COLLECTION, BED_TYPES_COLLECTION, MEAL_PLANS_COLLECTION]) {
        await ctx.createCollection(name);
        await ctx.createIndex(name, { key: 1 }, { name: 'key_unique', unique: true });
      }
    },
  },
  {
    id: '0023-kyc-gst-registrations',
    description: 'KYC: further GST registrations per business — duplicate lookup by GSTIN, review queue for pending ones',
    up: async (ctx) => {
      await ctx.createIndex(APPLICATIONS_COLLECTION, { 'gstRegistrations.gstin': 1 }, { name: 'gst_registrations_gstin' });
      await ctx.createIndex(
        APPLICATIONS_COLLECTION,
        { 'gstRegistrations.status': 1 },
        { name: 'gst_registrations_pending', partialFilterExpression: { 'gstRegistrations.status': 'PENDING' } },
      );
    },
  },
  {
    id: '0024-htl-properties',
    description: 'Hotel properties: by org, by status and city, map index, unique slug and public reference, relay index',
    up: async (ctx) => {
      await ctx.createCollection(PROPERTIES_COLLECTION);
      await ctx.createIndex(PROPERTIES_COLLECTION, { hotelOrgId: 1, createdAt: -1 }, { name: 'org' });
      await ctx.createIndex(PROPERTIES_COLLECTION, { status: 1, cityId: 1 }, { name: 'status_city' });
      await ctx.createIndex(PROPERTIES_COLLECTION, { location: '2dsphere' }, { name: 'location_geo' });
      await ctx.createIndex(PROPERTIES_COLLECTION, { slug: 1 }, { name: 'slug_unique', unique: true });
      await ctx.createIndex(PROPERTIES_COLLECTION, { publicRef: 1 }, { name: 'ref_unique', unique: true });
      await ctx.createIndex(
        PROPERTIES_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0025-htl-room-types',
    description: 'Room types: by property in display order; a name only once per property (active ones)',
    up: async (ctx) => {
      await ctx.createCollection(ROOM_TYPES_COLLECTION);
      await ctx.createIndex(ROOM_TYPES_COLLECTION, { hotelOrgId: 1, propertyId: 1, order: 1 }, { name: 'property' });
      await ctx.createIndex(
        ROOM_TYPES_COLLECTION,
        { propertyId: 1, nameKey: 1 },
        { name: 'property_name_unique', unique: true, partialFilterExpression: { status: 'ACTIVE' } },
      );
    },
  },
];
