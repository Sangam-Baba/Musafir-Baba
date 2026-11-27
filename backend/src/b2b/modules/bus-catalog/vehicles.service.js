// @ts-check
/**
 * Buses (plan Stage 18 B2): add (registration number unique across MusafirBaba), change details, attach papers (an
 * uploaded `bus-paper` file, its number and expiry), send for approval (needs a layout and all four valid papers).
 * Changing the layout of an approved bus sends it back for approval. Retire stops it for good.
 */
import { newEvent } from '../../core/db/events.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { AMENITIES, PAPER_KINDS, paperProblems, sellable } from './domain/vehicle.js';
import { EVENTS } from './events.js';
import { LayoutRecord } from './models/layout.model.js';
import { VehicleRecord } from './models/vehicle.model.js';

export const PAPER_FILE_PURPOSE = 'bus-paper';

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, today: () => string,
 *   files?: { describe: (orgId: string, fileId: string) => Promise<{ purpose: string } | null> } }} VehicleDeps
 * @typedef {{ orgId: string, userId: string }} Operator
 */

/** @param {Record<string, any>} v @param {string} [today] */
export const vehicleDto = (v, today) => ({
  id: String(v._id),
  regNo: v.regNo,
  name: v.name,
  acType: v.acType,
  kind: v.kind,
  layoutId: v.layoutId,
  amenities: v.amenities,
  photos: (v.photos ?? []).map((/** @type {any} */ p) => ({
    id: String(p._id),
    category: p.category,
    caption: p.caption,
    placeholder: p.placeholder,
    urls: Object.fromEntries(Object.entries(p.variants ?? {}).map(([k, x]) => [k, /** @type {any} */ (x).url])),
  })),
  papers: v.papers.map((/** @type {any} */ p) => ({ kind: p.kind, fileId: p.fileId, number: p.number, expiresOn: p.expiresOn })),
  status: v.status,
  review: v.review,
  ...(today ? { paperProblems: paperProblems(v.papers, today), sellable: sellable(/** @type {any} */ (v), today) } : {}),
  version: v.version,
  updatedAt: v.updatedAt,
});

/** @param {string} regNo */
export const normaliseRegNo = (regNo) => regNo.toUpperCase().replace(/[\s-]/g, '');

/** @param {string} orgId @param {string} id */
async function own(orgId, id) {
  const v = /^[a-f0-9]{24}$/.test(id) ? await VehicleRecord.findOne({ _id: id, operatorOrgId: orgId }).lean() : null;
  if (!v) throw new NotFoundError('BUS_NOT_FOUND');
  return /** @type {Record<string, any>} */ (v);
}
/** @param {string} orgId @param {string | null | undefined} layoutId */
async function assertLayout(orgId, layoutId) {
  if (layoutId && !(await LayoutRecord.exists({ _id: layoutId, operatorOrgId: orgId }))) throw new NotFoundError('LAYOUT_NOT_FOUND');
}
/** @param {string[]} list */
function checkedAmenities(list) {
  const bad = list.filter((a) => !(/** @type {readonly string[]} */ (AMENITIES).includes(a)));
  if (bad.length) throw new DomainError('AMENITY_UNKNOWN', { amenities: bad });
  return [...new Set(list)];
}

/** @typedef {{ who: Operator, id: string, set: Record<string, unknown>, expectedVersion: number, events?: any[] }} ChangeArgs */

/** A guarded change (version, not retired), with events pushed in the same update. @param {VehicleDeps} deps @param {ChangeArgs} c */
async function changeVehicle(deps, { who, id, set, expectedVersion, events = [] }) {
  const res = await VehicleRecord.updateOne(
    { _id: id, operatorOrgId: who.orgId, version: expectedVersion, status: { $ne: 'RETIRED' } },
    {
      $set: { ...set, ...(events.length ? { hasPendingEvents: true } : {}) },
      $inc: { version: 1 },
      ...(events.length ? { $push: { pendingEvents: { $each: events } } } : {}),
    },
  );
  if (res.modifiedCount !== 1) throw new ConflictError('VERSION_CONFLICT');
  return vehicleDto(await own(who.orgId, id), deps.today());
}

/** @param {VehicleDeps} deps @param {Operator} who @param {string} id @param {{ kind: typeof PAPER_KINDS[number], fileId: string, number: string, expiresOn: string, expectedVersion: number }} a */
async function setPaper(deps, who, id, a) {
  const v = await own(who.orgId, id);
  if (!(/** @type {readonly string[]} */ (PAPER_KINDS).includes(a.kind))) throw new DomainError('PAPER_KIND_INVALID');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.expiresOn) || Number.isNaN(Date.parse(`${a.expiresOn}T00:00:00Z`)))
    throw new DomainError('EXPIRY_INVALID');
  const file = deps.files ? await deps.files.describe(who.orgId, a.fileId) : null;
  if (!file || file.purpose !== PAPER_FILE_PURPOSE) throw new NotFoundError('FILE_NOT_FOUND');
  const papers = [
    ...v.papers.filter((/** @type {any} */ p) => p.kind !== a.kind),
    { kind: a.kind, fileId: a.fileId, number: a.number.trim(), expiresOn: a.expiresOn, addedAt: deps.clock.now() },
  ];
  return changeVehicle(deps, { who, id, set: { papers }, expectedVersion: a.expectedVersion });
}

/** Send for approval: a layout and four valid papers. @param {VehicleDeps} deps @param {Operator} who @param {string} id @param {number} expectedVersion */
async function submit(deps, who, id, expectedVersion) {
  const v = await own(who.orgId, id);
  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(v.status)) throw new ConflictError('BUS_NOT_EDITABLE', { status: v.status });
  if (!v.layoutId) throw new DomainError('LAYOUT_REQUIRED');
  const problems = paperProblems(v.papers, deps.today());
  if (problems.length) throw new DomainError('PAPERS_INCOMPLETE', { problems });
  const events = [newEvent(EVENTS.vehicleSubmitted, { orgId: who.orgId, vehicleId: id, regNo: v.regNo }, deps)];
  return changeVehicle(deps, { who, id, set: { status: 'SUBMITTED' }, expectedVersion, events });
}

/** @param {VehicleDeps} deps */
export function createVehicles(deps) {
  const change = (/** @type {ChangeArgs} */ c) => changeVehicle(deps, c);
  return {
    /** @param {Operator} who @param {{ regNo: string, name?: string | null, acType: 'AC' | 'NON_AC', kind: 'SEATER' | 'SLEEPER' | 'SEMI_SLEEPER' | 'MIXED', layoutId?: string | null, amenities?: string[] }} a */
    async create(who, a) {
      const regNo = normaliseRegNo(a.regNo);
      if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(regNo)) throw new DomainError('REG_NO_INVALID');
      await assertLayout(who.orgId, a.layoutId);
      try {
        const v = await VehicleRecord.create({
          operatorOrgId: who.orgId,
          regNo,
          name: a.name ?? null,
          acType: a.acType,
          kind: a.kind,
          layoutId: a.layoutId ?? null,
          amenities: checkedAmenities(a.amenities ?? []),
          createdBy: `user:${who.userId}`,
        });
        return vehicleDto(v.toObject(), deps.today());
      } catch (e) {
        if (/** @type {any} */ (e)?.code === 11000) throw new ConflictError('BUS_ALREADY_LISTED');
        throw e;
      }
    },
    /** @param {Operator} who @param {string} id @param {{ name?: string | null, acType?: 'AC' | 'NON_AC', kind?: string, layoutId?: string | null, amenities?: string[], expectedVersion: number }} a */
    async update(who, id, a) {
      const v = await own(who.orgId, id);
      /** @type {Record<string, unknown>} */
      const set = {};
      for (const k of /** @type {const} */ (['name', 'acType', 'kind'])) if (a[k] !== undefined) set[k] = a[k];
      if (a.amenities !== undefined) set.amenities = checkedAmenities(a.amenities);
      if (a.layoutId !== undefined && a.layoutId !== v.layoutId) {
        await assertLayout(who.orgId, a.layoutId);
        set.layoutId = a.layoutId;
        if (['APPROVED', 'SUBMITTED', 'SUSPENDED'].includes(v.status)) set.status = 'SUBMITTED'; // new seats → staff look again
      }
      return change({ who, id, set, expectedVersion: a.expectedVersion });
    },
    /** @param {Operator} who @param {string} id @param {{ kind: typeof PAPER_KINDS[number], fileId: string, number: string, expiresOn: string, expectedVersion: number }} a */
    setPaper: (who, id, a) => setPaper(deps, who, id, a),
    /** @param {Operator} who @param {string} id @param {number} expectedVersion */
    submit: (who, id, expectedVersion) => submit(deps, who, id, expectedVersion),
    /** @param {Operator} who @param {string} id @param {number} expectedVersion */
    retire: async (who, id, expectedVersion) => (
      await own(who.orgId, id),
      change({ who, id, set: { status: 'RETIRED' }, expectedVersion })
    ),
    /** @param {string} orgId */
    list: async (orgId) =>
      (await VehicleRecord.find({ operatorOrgId: orgId }).sort({ createdAt: 1 }).lean()).map((v) => vehicleDto(v, deps.today())),
    /** @param {string} orgId @param {string} id */
    get: async (orgId, id) => vehicleDto(await own(orgId, id), deps.today()),
  };
}
