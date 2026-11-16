// @ts-check
/**
 * The public content read model (plan Stage 03 §3.9): what the website and the B2B dashboard show for a property —
 * only a LIVE listing visible on the caller's channel (domain/visibility.js), found by its public reference or
 * its slug. Master-list keys become names; photos come with their public addresses. Never included: the hotel
 * company, its reservation contacts, GSTIN or internal history. A hidden listing answers exactly like a missing one.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { todayIn } from '../../core/dates.js';
import { NotFoundError } from '../../core/errors.js';
import { parseReference } from '../../core/ids.js';
import { isVisible } from './domain/visibility.js';
import { AmenityRecord, BedTypeRecord, CityRecord, PropertyTypeRecord } from './models/masters.model.js';
import { PropertyRecord } from './models/property.model.js';
import { RoomTypeRecord } from './models/room-type.model.js';
import { GST_STATE_NAMES } from './state-names.js';

const PUBLIC = systemScope('hotel-catalog: public hotel content', { routine: true });

/** @param {any[]} photos @param {string | null} roomTypeId @param {(key: string) => string} url */
const photosFor = (photos, roomTypeId, url) =>
  photos
    .filter((x) => x.roomTypeId === roomTypeId)
    .sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.order - b.order)
    .map((x) => ({
      category: x.category,
      caption: x.caption,
      placeholder: x.placeholder,
      sizes: Object.fromEntries(
        Object.entries(x.variants).map(([n, v]) => [
          n,
          { url: url(/** @type {any} */ (v).key), width: /** @type {any} */ (v).width, height: /** @type {any} */ (v).height },
        ]),
      ),
    }));

/** Names for the master-list keys used by a property and its room types. @param {any} p @param {any[]} rooms */
async function namesFor(p, rooms) {
  const amenityKeys = [...new Set([...(p.amenities ?? []), ...rooms.flatMap((r) => r.amenities ?? [])])];
  const bedKeys = [...new Set(rooms.flatMap((r) => (r.beds ?? []).map((/** @type {any} */ b) => b.bedTypeKey)))];
  const [city, type, amenities, beds] = await Promise.all([
    p.cityId ? CityRecord.findById(p.cityId).lean() : null,
    PropertyTypeRecord.findOne({ key: p.propertyTypeKey }).lean(),
    AmenityRecord.find({ key: { $in: amenityKeys } }).lean(),
    BedTypeRecord.find({ key: { $in: bedKeys } }).lean(),
  ]);
  return {
    city: /** @type {any} */ (city),
    type: type ? { key: type.key, name: type.name } : { key: p.propertyTypeKey, name: p.propertyTypeKey },
    amenity: new Map(amenities.map((/** @type {any} */ a) => [a.key, { key: a.key, name: a.name, group: a.group, icon: a.icon ?? null }])),
    bed: new Map(beds.map((b) => [b.key, b.name])),
  };
}

/** @param {any} r @param {Awaited<ReturnType<typeof namesFor>>} names @param {any[]} photos @param {(key: string) => string} url */
const roomDto = (r, names, photos, url) => ({
  id: String(r._id),
  name: r.name,
  description: r.description,
  sizeSqm: r.sizeSqm,
  beds: (r.beds ?? []).map((/** @type {any} */ b) => ({ name: names.bed.get(b.bedTypeKey) ?? b.bedTypeKey, count: b.count })),
  maxAdults: r.maxAdults,
  maxChildren: r.maxChildren,
  maxOccupancy: r.maxOccupancy,
  extraBeds: { allowed: r.extraBeds?.allowed ?? false, max: r.extraBeds?.max ?? 0 },
  amenities: (r.amenities ?? []).map((/** @type {string} */ k) => names.amenity.get(k)).filter(Boolean),
  photos: photosFor(photos, String(r._id), url),
});

/**
 * The listing, if this viewer may see it (otherwise 404, exactly like a missing one).
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @param {string} refOrSlug
 * @param {{ channel: import('./domain/visibility.js').Channel, clientCategory?: string | null }} viewer
 */
async function findVisible(deps, refOrSlug, viewer) {
  const ref = /^mbht-/i.test(refOrSlug) ? parseReference(refOrSlug) : null;
  const filter = ref ? { publicRef: ref } : /^[a-z0-9-]{3,100}$/.test(refOrSlug) ? { slug: refOrSlug } : null;
  const p = /** @type {any} */ (filter ? await PropertyRecord.findOne(filter).setOptions(PUBLIC).lean() : null);
  const today = p ? todayIn(deps.clock, p.timeZone) : '';
  if (!p || !isVisible(p, { channel: viewer.channel, today, clientCategory: viewer.clientCategory ?? null }))
    throw new NotFoundError('HOTEL_NOT_FOUND');
  return p;
}

/** @param {any} p @param {Awaited<ReturnType<typeof namesFor>>} names @param {any} area */
const addressOf = (p, names, area) => ({
  line1: p.address?.line1 ?? null,
  line2: p.address?.line2 ?? null,
  pin: p.address?.pin ?? null,
  area: area?.name ?? null,
  city: names.city?.name ?? null,
  state: GST_STATE_NAMES[p.stateCode] ?? null,
});

/** @param {{ clock: import('../../core/clock.js').Clock, mediaUrl: (key: string) => string }} deps */
export function createContentService(deps) {
  return {
    /**
     * @param {string} refOrSlug
     * @param {{ channel: import('./domain/visibility.js').Channel, clientCategory?: string | null }} viewer
     */
    async publicProperty(refOrSlug, viewer) {
      const p = await findVisible(deps, refOrSlug, viewer);
      const rooms = await RoomTypeRecord.find({ hotelOrgId: p.hotelOrgId, propertyId: String(p._id), status: 'ACTIVE' })
        .sort({ order: 1, createdAt: 1 })
        .lean();
      const names = await namesFor(p, rooms);
      const area = names.city?.areas?.find((/** @type {any} */ a) => String(a._id) === p.areaId && a.active);
      const photos = p.photos ?? [];
      return {
        publicRef: p.publicRef,
        slug: p.slug,
        name: p.name,
        type: names.type,
        starRating: p.starRating,
        description: p.description,
        address: addressOf(p, names, area),
        location: p.location?.coordinates ? { lat: p.location.coordinates[1], lng: p.location.coordinates[0] } : null,
        checkInTime: p.checkInTime,
        checkOutTime: p.checkOutTime,
        timeZone: p.timeZone,
        policies: p.policies,
        amenities: (p.amenities ?? []).map((/** @type {string} */ k) => names.amenity.get(k)).filter(Boolean),
        photos: photosFor(photos, null, deps.mediaUrl),
        roomTypes: rooms.map((r) => roomDto(r, names, photos, deps.mediaUrl)),
      };
    },
  };
}
