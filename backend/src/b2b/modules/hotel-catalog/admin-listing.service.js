// @ts-check
/**
 * MusafirBaba's listing tools (plan Stage 03 §3.5–3.7): every property (filters), the approval queue (submitted
 * listings and live listings with a pending revision, oldest first), a detail view with the automatic checklist
 * and possible duplicates (same or close name within 200 m), and the decisions: approve (first time → LIVE +
 * `property.published`), request changes with a comment per section, suspend (off search at once, existing
 * bookings unaffected), reactivate, archive. Never for an organisation the reviewer belongs to. Each decision is
 * one conditional update with its history entry and event.
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, ForbiddenError } from '../../core/errors.js';
import { DUPLICATE_RADIUS_M, namesSimilar } from './domain/duplicates.js';
import { listingTransition, submitBlockers } from './domain/listing-workflow.js';
import { distanceKm } from './domain/property.js';
import { EVENTS } from './events.js';
import { CityRecord } from './models/masters.model.js';
import { PropertyRecord } from './models/property.model.js';
import { RoomTypeRecord } from './models/room-type.model.js';

const ADMIN = systemScope('hotel-catalog: MusafirBaba listing tools');

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock,
 *   properties: ReturnType<typeof import('./property.service.js').createPropertyService>,
 *   orgInfo: (orgId: string) => Promise<{ displayName: string, status: string } | null>,
 *   isOwnOrg?: (staffId: string, orgId: string) => Promise<boolean>, mediaUrl?: (key: string) => string }} AdminListingDeps
 */
/** @typedef {'approve' | 'requestChanges' | 'suspend' | 'reactivate' | 'archive'} AdminAction */

/** @param {any} p @param {Map<string, string>} cityNames @param {(key: string) => string} [url] */
const listItem = (p, cityNames, url = (k) => k) => {
  const cover = (p.photos ?? []).find((/** @type {any} */ x) => x.isCover);
  return {
    id: String(p._id),
    publicRef: p.publicRef,
    name: p.name,
    status: p.status,
    hotelOrgId: p.hotelOrgId,
    city: p.cityId ? (cityNames.get(p.cityId) ?? null) : null,
    round: p.round ?? 0,
    submittedAt: p.submittedAt ?? null,
    hasPendingRevision: Boolean(p.pendingRevision),
    revisionSubmittedAt: p.pendingRevision?.submittedAt ?? null,
    coverUrl: cover ? url(cover.variants.thumb.key) : null,
  };
};

/** Same or close names within 200 m (any status but archived). @param {any} p */
async function duplicatesOf(p) {
  if (!p.location?.coordinates) return [];
  const near = await PropertyRecord.find(
    {
      _id: { $ne: p._id },
      status: { $ne: 'ARCHIVED' },
      location: { $nearSphere: { $geometry: p.location, $maxDistance: DUPLICATE_RADIUS_M } },
    },
    { name: 1, publicRef: 1, hotelOrgId: 1, status: 1, location: 1 },
  )
    .setOptions(ADMIN)
    .lean();
  return near
    .filter((n) => namesSimilar(n.name, p.name))
    .map((n) => ({
      id: String(n._id),
      publicRef: n.publicRef,
      name: n.name,
      status: n.status,
      sameOrganisation: n.hotelOrgId === p.hotelOrgId,
      distanceM: Math.round(distanceKm(/** @type {[number, number]} */ (n.location?.coordinates), p.location.coordinates) * 1000),
    }));
}

/**
 * @param {AdminListingDeps} deps
 * @param {{ who: { staffId: string }, p: any, action: AdminAction, note: string | null, comments?: { section: string, note: string }[] }} input
 */
async function decide(deps, { who, p, action, note, comments }) {
  if (deps.isOwnOrg && (await deps.isOwnOrg(who.staffId, p.hotelOrgId))) throw new ForbiddenError('LISTING_OWN_ORGANISATION');
  const status = listingTransition(p.status, action);
  const now = deps.clock.now();
  const by = `staff:${who.staffId}`;
  const base = { orgId: p.hotelOrgId, propertyId: String(p._id), publicRef: p.publicRef, name: p.name };
  const eventType = {
    approve: EVENTS.propertyPublished,
    reactivate: EVENTS.propertyPublished,
    requestChanges: EVENTS.propertyChangesRequested,
    suspend: EVENTS.propertySuspended,
    archive: EVENTS.propertyArchived,
  }[action];
  /** @type {Record<string, unknown>} */
  const set = { status, updatedBy: by, hasPendingEvents: true, review: { comments: comments ?? [], note, by, at: now } };
  if (action === 'approve' || action === 'requestChanges') set.decidedAt = now;
  if (action === 'approve' && !p.publishedAt) set.publishedAt = now;
  const res = await PropertyRecord.updateOne(
    { _id: p._id, hotelOrgId: p.hotelOrgId, status: p.status, version: p.version },
    {
      $set: set,
      $inc: { version: 1 },
      $push: { history: { at: now, action, status, by, note }, pendingEvents: newEvent(eventType, { ...base, reason: note }, deps) },
    },
  ).setOptions(ADMIN);
  if (res.modifiedCount !== 1) throw new ConflictError('PROPERTY_CHANGED_MEANWHILE');
}

/** @param {AdminListingDeps} deps */
export function createAdminListingService(deps) {
  return {
    /** @param {{ status?: string, cityId?: string, hotelOrgId?: string, q?: string, queue?: boolean, limit?: number }} f */
    async list(f) {
      /** @type {Record<string, unknown>} */
      const filter = f.queue
        ? { $or: [{ status: 'SUBMITTED' }, { pendingRevision: { $ne: null }, status: { $in: ['LIVE', 'SUSPENDED'] } }] }
        : {};
      if (f.status) filter.status = f.status;
      if (f.cityId) filter.cityId = f.cityId;
      if (f.hotelOrgId) filter.hotelOrgId = f.hotelOrgId;
      if (f.q)
        filter.$and = [
          { $or: [{ name: { $regex: f.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { publicRef: f.q.toUpperCase() }] },
        ];
      const docs = await PropertyRecord.find(filter)
        .sort(f.queue ? { submittedAt: 1, _id: 1 } : { createdAt: -1 })
        .limit(Math.min(f.limit ?? 50, 200))
        .setOptions(ADMIN)
        .lean();
      const cities = await CityRecord.find({ _id: { $in: [...new Set(docs.map((d) => d.cityId).filter(Boolean))] } }, { name: 1 }).lean();
      const cityNames = new Map(cities.map((c) => [String(c._id), c.name]));
      return docs.map((d) => listItem(d, cityNames, deps.mediaUrl));
    },

    /** @param {string} id */
    async detail(id) {
      const { raw, view } = await deps.properties.viewById(id);
      const roomTypes = await RoomTypeRecord.find({ hotelOrgId: raw.hotelOrgId, propertyId: id }).sort({ order: 1, createdAt: 1 }).lean();
      const active = roomTypes.filter((r) => r.status === 'ACTIVE');
      const org = await deps.orgInfo(raw.hotelOrgId);
      const blockers = submitBlockers(
        view,
        active.map((r) => ({ id: String(r._id), name: r.name })),
        { businessVerified: org?.status === 'ACTIVE' },
      );
      return {
        property: view,
        organisation: org ? { id: raw.hotelOrgId, name: org.displayName, status: org.status } : null,
        roomTypes: roomTypes.map((r) => ({
          id: String(r._id),
          name: r.name,
          status: r.status,
          maxOccupancy: r.maxOccupancy,
          beds: r.beds,
          sizeSqm: r.sizeSqm,
        })),
        checklist: { blockers, duplicates: await duplicatesOf(raw) },
      };
    },

    /**
     * @param {{ staffId: string }} who
     * @param {string} id
     * @param {{ action: AdminAction, note: string | null, comments?: { section: string, note: string }[] }} input
     */
    async act(who, id, input) {
      const { raw } = await deps.properties.viewById(id);
      if (input.action === 'requestChanges' && !(input.comments?.length || input.note)) throw new DomainError('COMMENTS_REQUIRED');
      if ((input.action === 'suspend' || input.action === 'archive') && !input.note) throw new DomainError('REASON_REQUIRED');
      if (input.action === 'approve' || input.action === 'reactivate') {
        const org = await deps.orgInfo(raw.hotelOrgId);
        if (org?.status !== 'ACTIVE') throw new ConflictError('BUSINESS_NOT_ACTIVE'); // a suspended hotel company's listings stay off
      }
      await decide(deps, { who, p: raw, action: input.action, note: input.note, comments: input.comments });
      return this.detail(id);
    },
  };
}
