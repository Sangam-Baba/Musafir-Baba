// @ts-check
/**
 * Cancellation policies of a property (plan Stage 04 §3.2). Every call goes through the property first
 * (hotel-catalog `loadOwned`), so the same limits apply: another org's or an unassigned property → 404.
 * Changes on the version the screen loaded (412 otherwise); never on an archived property. Archived, never
 * deleted. A policy still used by a rate plan (not archived) can't be archived.
 */
import { AppError, ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { MAX_POLICIES_PER_PROPERTY, normalisePolicy, summarise } from './domain/cancellation.js';
import { CancellationPolicyRecord } from './models/cancellation-policy.model.js';
import { RatePlanRecord } from './models/rate-plan.model.js';
import { PERMISSIONS } from './permissions.js';

const ID = /^[a-f0-9]{24}$/;

/** @typedef {import('./domain/cancellation.js').PolicyInput} PolicyInput */
/** @typedef {import('../../core/context.js').RequestContext} Ctx */
/** @typedef {{ loadOwned: (ctx: Ctx, id: string, permission: string) => Promise<any> }} Properties */

/** @param {any} p */
export const policyDto = (p) => ({
  id: String(p._id),
  propertyId: p.propertyId,
  name: p.name,
  nonRefundable: p.nonRefundable,
  rules: p.rules,
  noShow: p.noShow,
  summary: p.summary,
  status: p.status,
  version: p.version,
});

/** @param {string} name */
const nameKey = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** @param {unknown} error */
const nameTaken = (error) => {
  if (/** @type {{ code?: number }} */ (error).code === 11000) throw new ConflictError('POLICY_NAME_TAKEN');
  throw error;
};

/** @param {Ctx} ctx */
const actorOf = (ctx) => (ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system');

/** @param {PolicyInput} input */
function prepared(input) {
  const p = normalisePolicy(input);
  return { ...p, nameKey: nameKey(p.name), summary: summarise(p) };
}

/** @param {{ properties: Properties }} deps @param {Ctx} ctx @param {string} propertyId */
async function editableProperty(deps, ctx, propertyId) {
  const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.calendarManage);
  if (p.status === 'ARCHIVED') throw new DomainError('PROPERTY_ARCHIVED');
  return p;
}

/** @param {any} p @param {string} id */
async function onePolicy(p, id) {
  const doc = ID.test(id)
    ? await CancellationPolicyRecord.findOne({ _id: id, hotelOrgId: p.hotelOrgId, propertyId: String(p._id) }).lean()
    : null;
  if (!doc) throw new NotFoundError('POLICY_NOT_FOUND');
  return doc;
}

/** @param {{ properties: Properties }} deps */
export function createCancellationPolicyService(deps) {
  /** @param {Ctx} ctx @param {string} propertyId */
  const editable = (ctx, propertyId) => editableProperty(deps, ctx, propertyId);
  const one = onePolicy;

  return {
    /** @param {Ctx} ctx @param {string} propertyId */
    async list(ctx, propertyId) {
      const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.calendarRead);
      const docs = await CancellationPolicyRecord.find({ hotelOrgId: p.hotelOrgId, propertyId, status: 'ACTIVE' }).sort({ name: 1 }).lean();
      return docs.map(policyDto);
    },

    /** @param {Ctx} ctx @param {string} propertyId @param {PolicyInput} input */
    async create(ctx, propertyId, input) {
      const p = await editable(ctx, propertyId);
      const data = prepared(input);
      if (
        (await CancellationPolicyRecord.countDocuments({ hotelOrgId: p.hotelOrgId, propertyId, status: 'ACTIVE' })) >=
        MAX_POLICIES_PER_PROPERTY
      )
        throw new DomainError('TOO_MANY_POLICIES');
      const by = actorOf(ctx);
      const doc = await CancellationPolicyRecord.create({
        ...data,
        hotelOrgId: p.hotelOrgId,
        propertyId,
        createdBy: by,
        updatedBy: by,
      }).catch(nameTaken);
      return policyDto(doc.toObject());
    },

    /** @param {Ctx} ctx @param {{ propertyId: string, id: string, data: PolicyInput, version: number }} input */
    async update(ctx, input) {
      const p = await editable(ctx, input.propertyId);
      const current = await one(p, input.id);
      if (current.status !== 'ACTIVE') throw new DomainError('POLICY_ARCHIVED');
      const res = await CancellationPolicyRecord.updateOne(
        { _id: current._id, hotelOrgId: p.hotelOrgId, version: input.version, status: 'ACTIVE' },
        { $set: { ...prepared(input.data), updatedBy: actorOf(ctx) }, $inc: { version: 1 } },
      ).catch(nameTaken);
      if (res.modifiedCount !== 1) throw new AppError('VERSION_CONFLICT', 412, 'The policy was changed meanwhile — reload and try again');
      return policyDto(await one(p, input.id));
    },

    /** @param {Ctx} ctx @param {string} propertyId @param {string} id */
    async archive(ctx, propertyId, id) {
      const p = await editable(ctx, propertyId);
      const current = await one(p, id);
      const used = await RatePlanRecord.exists({
        hotelOrgId: p.hotelOrgId,
        propertyId,
        cancellationPolicyId: id,
        status: { $in: ['ACTIVE', 'INACTIVE'] },
      });
      if (used) throw new ConflictError('POLICY_IN_USE');
      await CancellationPolicyRecord.updateOne(
        { _id: current._id, hotelOrgId: p.hotelOrgId, status: 'ACTIVE' },
        { $set: { status: 'ARCHIVED', updatedBy: actorOf(ctx) }, $inc: { version: 1 } },
      );
    },
  };
}
