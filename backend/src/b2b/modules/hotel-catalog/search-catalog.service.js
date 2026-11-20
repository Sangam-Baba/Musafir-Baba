// @ts-check
/**
 * Search read model (plan Stage 06 §3.2): LIVE properties visible on the caller's channel, found by city / area,
 * by distance from a point (`$geoNear` on the 2dsphere index) or by public reference — with the facts search needs
 * (time zone and room types for availability, state for GST, city / stars / amenities for filters, cover photo).
 * Read-only, across hotels (logged system scope), capped at 200 properties, `maxTimeMS` on every query.
 * Never returned: the hotel company's contacts, GSTIN, reviews or history.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { todayIn } from '../../core/dates.js';
import { parseReference } from '../../core/ids.js';
import { isVisible } from './domain/visibility.js';
import { CityRecord } from './models/masters.model.js';
import { PropertyRecord } from './models/property.model.js';
import { RoomTypeRecord } from './models/room-type.model.js';

const SEARCH = systemScope('hotel-catalog: search read model', { routine: true });
export const MAX_CANDIDATES = 200;
export const MAX_RADIUS_KM = 50;
export const MAX_DESTINATION_PROPERTIES = 20_000;
const QUERY_MS = 2000;
const FIELDS = {
  name: 1,
  publicRef: 1,
  slug: 1,
  hotelOrgId: 1,
  status: 1,
  cityId: 1,
  areaId: 1,
  stateCode: 1,
  starRating: 1,
  timeZone: 1,
  amenities: 1,
  location: 1,
  propertyTypeKey: 1,
  visibility: 1,
  photos: 1,
};

/**
 * @typedef {'WEBSITE' | 'B2B'} SearchChannel
 * @typedef {{ cityId: string, areaId?: string | null } | { near: { lat: number, lng: number, radiusKm: number } } | { refs: string[] } | { ids: string[] }} Where
 * @typedef {{ id: string, name: string, maxAdults: number, maxChildren: number, maxOccupancy: number }} SearchRoomType
 * @typedef {{ id: string, publicRef: string, slug: string, name: string, hotelOrgId: string, cityId: string | null,
 *   areaId: string | null, cityName: string | null, areaName: string | null, stateCode: string | null, starRating: number, timeZone: string, amenities: string[],
 *   propertyTypeKey: string, location: { lat: number, lng: number } | null, distanceKm: number | null,
 *   coverUrl: string | null, roomTypes: SearchRoomType[] }} SearchProperty
 */

/** @param {SearchChannel} channel */
const channelFilter = (channel) =>
  channel === 'WEBSITE' ? { 'visibility.website': { $ne: false } } : { 'visibility.b2b': { $ne: false } };

/**
 * @param {Where} where
 * @param {SearchChannel} channel
 */
async function findLive(where, channel) {
  const base = { status: 'LIVE', ...channelFilter(channel) };
  if ('near' in where) {
    const radius = Math.min(Math.max(where.near.radiusKm, 0.1), MAX_RADIUS_KM) * 1000;
    return PropertyRecord.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [where.near.lng, where.near.lat] },
          distanceField: 'distanceM',
          maxDistance: radius,
          query: base,
          key: 'location',
          spherical: true,
        },
      },
      { $limit: MAX_CANDIDATES },
      { $project: { ...FIELDS, distanceM: 1 } },
    ])
      .option({ ...SEARCH, maxTimeMS: QUERY_MS })
      .exec();
  }
  if ('ids' in where)
    return PropertyRecord.find(
      { ...base, _id: { $in: where.ids.filter((id) => /^[a-f0-9]{24}$/.test(id)).slice(0, MAX_CANDIDATES) } },
      FIELDS,
    )
      .maxTimeMS(QUERY_MS)
      .setOptions(SEARCH)
      .lean();
  const filter =
    'refs' in where
      ? {
          ...base,
          publicRef: {
            $in: where.refs
              .map((r) => parseReference(r))
              .filter(Boolean)
              .slice(0, MAX_CANDIDATES),
          },
        }
      : { ...base, cityId: where.cityId, ...(where.areaId ? { areaId: where.areaId } : {}) };
  return PropertyRecord.find(filter, FIELDS).limit(MAX_CANDIDATES).maxTimeMS(QUERY_MS).setOptions(SEARCH).lean();
}

/** @param {any} p @param {(key: string) => string} url */
function coverOf(p, url) {
  const own = (p.photos ?? []).filter((/** @type {any} */ x) => !x.roomTypeId);
  const cover = own.find((/** @type {any} */ x) => x.isCover) ?? own[0];
  const v = cover?.variants?.card ?? cover?.variants?.thumb;
  return v?.key ? url(v.key) : null;
}

/**
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @param {{ channel: SearchChannel }} q
 */
async function destinationSource(deps, q) {
  const [cities, live] = await Promise.all([
    CityRecord.find({ active: true }, { name: 1, slug: 1, areas: 1 }).maxTimeMS(QUERY_MS).lean(),
    PropertyRecord.find(
      { status: 'LIVE', ...channelFilter(q.channel) },
      { name: 1, publicRef: 1, slug: 1, cityId: 1, areaId: 1, timeZone: 1, status: 1, visibility: 1 },
    )
      .limit(MAX_DESTINATION_PROPERTIES)
      .maxTimeMS(QUERY_MS)
      .setOptions(SEARCH)
      .lean(),
  ]);
  const visible = live.filter((p) => isVisible(p, { channel: q.channel, today: todayIn(deps.clock, p.timeZone), clientCategory: null }));
  return {
    cities: cities.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      areas: (c.areas ?? []).filter((a) => a.active).map((a) => ({ id: String(a._id), name: a.name, slug: a.slug })),
    })),
    properties: visible.map((p) => ({
      ref: p.publicRef,
      slug: p.slug,
      name: p.name,
      cityId: p.cityId ?? null,
      areaId: p.areaId ?? null,
    })),
  };
}

/**
 * City and area names for these properties.
 * @param {any[]} props
 */
async function placeNames(props) {
  const cities = await CityRecord.find({ _id: { $in: [...new Set(props.map((p) => p.cityId).filter(Boolean))] } }, { name: 1, areas: 1 })
    .maxTimeMS(QUERY_MS)
    .lean();
  return {
    city: new Map(cities.map((c) => [String(c._id), c.name])),
    area: new Map(cities.flatMap((c) => (c.areas ?? []).map((a) => [String(a._id), a.name]))),
  };
}

/**
 * Active room types of these properties, grouped by property.
 * @param {string[]} ids
 */
async function roomTypesOf(ids) {
  const rooms = await RoomTypeRecord.find(
    { propertyId: { $in: ids }, status: 'ACTIVE' },
    { propertyId: 1, name: 1, maxAdults: 1, maxChildren: 1, maxOccupancy: 1, order: 1 },
  )
    .sort({ order: 1, createdAt: 1 })
    .maxTimeMS(QUERY_MS)
    .setOptions(SEARCH)
    .lean();
  /** @type {Map<string, SearchRoomType[]>} */
  const byProperty = new Map();
  for (const r of rooms) {
    const list = byProperty.get(r.propertyId) ?? [];
    list.push({ id: String(r._id), name: r.name, maxAdults: r.maxAdults, maxChildren: r.maxChildren, maxOccupancy: r.maxOccupancy });
    byProperty.set(r.propertyId, list);
  }
  return byProperty;
}

const FACT_FIELDS = {
  name: 1,
  publicRef: 1,
  hotelOrgId: 1,
  cityId: 1,
  areaId: 1,
  stateCode: 1,
  address: 1,
  timeZone: 1,
  checkInTime: 1,
  checkOutTime: 1,
  contacts: 1,
};

/** @param {Record<string, any> | null | undefined} o @param {string[]} keys */
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o?.[k] ?? null]));

/**
 * What a booking keeps a copy of (Stage 08 snapshot, voucher): name, address, city, state, time zone, check-in /
 * check-out times and the property's reservations contacts (for the hotel alert). Null when not found.
 * @param {string} propertyId
 */
async function bookingFactsOf(propertyId) {
  if (!/^[a-f0-9]{24}$/.test(propertyId)) return null;
  const p = /** @type {any} */ (
    await PropertyRecord.findOne({ _id: propertyId }, FACT_FIELDS)
      .setOptions(systemScope('hotel-catalog: booking snapshot', { routine: true }))
      .maxTimeMS(QUERY_MS)
      .lean()
  );
  if (!p) return null;
  const names = await placeNames([p]);
  return {
    id: String(p._id),
    publicRef: p.publicRef,
    name: p.name,
    hotelOrgId: p.hotelOrgId,
    address: pick(p.address, ['line1', 'line2', 'pin']),
    cityName: names.city.get(p.cityId) ?? null,
    areaName: names.area.get(p.areaId) ?? null,
    stateCode: p.stateCode ?? null,
    timeZone: p.timeZone ?? 'Asia/Kolkata',
    checkInTime: p.checkInTime ?? null,
    checkOutTime: p.checkOutTime ?? null,
    contacts: pick(p.contacts, ['email', 'phone']),
  };
}

/** @param {{ clock: import('../../core/clock.js').Clock, mediaUrl?: (key: string) => string }} deps */
export function createSearchCatalog(deps) {
  const url = deps.mediaUrl ?? ((/** @type {string} */ k) => k);
  return {
    /**
     * Status and owner of properties (who may follow their live-availability rooms). Unknown ids are left out.
     * @param {string[]} ids
     * @returns {Promise<{ id: string, status: string, hotelOrgId: string }[]>}
     */
    async statusOf(ids) {
      const valid = ids.filter((id) => /^[a-f0-9]{24}$/.test(id)).slice(0, 50);
      if (valid.length === 0) return [];
      const docs = await PropertyRecord.find({ _id: { $in: valid } }, { status: 1, hotelOrgId: 1 })
        .maxTimeMS(QUERY_MS)
        .setOptions(SEARCH)
        .lean();
      return docs.map((d) => ({ id: String(d._id), status: d.status, hotelOrgId: d.hotelOrgId }));
    },

    /**
     * What autocomplete matches: active cities and areas, and live properties visible on the channel (names only).
     * @param {{ channel: SearchChannel }} q
     */
    destinationSource: (q) => destinationSource(deps, q),

    /** What a booking keeps a copy of (see `bookingFactsOf`). @param {string} propertyId */
    bookingFacts: (propertyId) => bookingFactsOf(propertyId),

    /**
     * @param {{ channel: SearchChannel, clientCategory?: string | null, where: Where }} q
     * @returns {Promise<SearchProperty[]>}
     */
    async candidates(q) {
      const found = /** @type {any[]} */ (await findLive(q.where, q.channel));
      const visible = found.filter((p) =>
        isVisible(p, { channel: q.channel, today: todayIn(deps.clock, p.timeZone), clientCategory: q.clientCategory ?? null }),
      );
      if (visible.length === 0) return [];
      const byProperty = await roomTypesOf(visible.map((p) => String(p._id)));
      const names = await placeNames(visible);
      return visible.map((p) => ({
        id: String(p._id),
        publicRef: p.publicRef,
        slug: p.slug,
        name: p.name,
        hotelOrgId: p.hotelOrgId,
        cityId: p.cityId ?? null,
        areaId: p.areaId ?? null,
        cityName: names.city.get(p.cityId) ?? null,
        areaName: names.area.get(p.areaId) ?? null,
        stateCode: p.stateCode ?? null,
        starRating: p.starRating ?? 0,
        timeZone: p.timeZone,
        amenities: p.amenities ?? [],
        propertyTypeKey: p.propertyTypeKey,
        location: p.location?.coordinates ? { lat: p.location.coordinates[1], lng: p.location.coordinates[0] } : null,
        distanceKm: typeof p.distanceM === 'number' ? Math.round(p.distanceM / 100) / 10 : null,
        coverUrl: coverOf(p, url),
        roomTypes: byProperty.get(String(p._id)) ?? [],
      }));
    },
  };
}
