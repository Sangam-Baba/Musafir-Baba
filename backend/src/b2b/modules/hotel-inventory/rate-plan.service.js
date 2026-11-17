// @ts-check
/**
 * Rate plans of a property (plan Stage 04 §3.1). Through the property first (same limits as Stage 03). Room
 * types come from hotel-catalog (active ones), meal plans from the master list, policies from this module.
 * Changes on the loaded version (412 otherwise); a plan others follow can't be archived or lose what they need.
 */
import { AppError, ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { checkRatePlan, MAX_RATE_PLANS_PER_PROPERTY } from './domain/rate-plan.js';
import { CancellationPolicyRecord } from './models/cancellation-policy.model.js';
import { RatePlanRecord } from './models/rate-plan.model.js';
import { PERMISSIONS } from './permissions.js';

const ID = /^[a-f0-9]{24}$/;
const OPEN = { $in: ['ACTIVE', 'INACTIVE'] };

/** @typedef {import('../../core/context.js').RequestContext} Ctx */
/** @typedef {import('./domain/rate-plan.js').RatePlanInput} RatePlanInput */
/**
 * @typedef {{ properties: { loadOwned: (ctx: Ctx, id: string, permission: string) => Promise<any> },
 *   roomTypesOf: (ctx: Ctx, propertyId: string) => Promise<{ id: string }[]>, mealPlanKeys: () => Promise<string[]> }} RatePlanDeps
 */

/** @param {any} r */
export const ratePlanDto = (r) => ({
  id: String(r._id),
  propertyId: r.propertyId,
  name: r.name,
  roomTypeIds: r.roomTypeIds,
  mealPlanKey: r.mealPlanKey,
  cancellationPolicyId: r.cancellationPolicyId,
  pricingModel: r.pricingModel,
  minAdvanceDays: r.minAdvanceDays,
  maxAdvanceDays: r.maxAdvanceDays,
  derived: r.derived ?? null,
  order: r.order,
  status: r.status,
  version: r.version,
});

/** @param {string} name */
const nameKey = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ');
/** @param {Ctx} ctx */
const actorOf = (ctx) => (ctx.actor.type === 'member' ? `user:${ctx.actor.userId}` : 'system');
/** @param {unknown} error */
const nameTaken = (error) => {
  if (/** @type {{ code?: number }} */ (error).code === 11000) throw new ConflictError('RATE_PLAN_NAME_TAKEN');
  throw error;
};

/** @param {RatePlanDeps} deps @param {Ctx} ctx @param {string} propertyId */
async function editableProperty(deps, ctx, propertyId) {
  const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.calendarManage);
  if (p.status === 'ARCHIVED') throw new DomainError('PROPERTY_ARCHIVED');
  return p;
}

/** @param {any} p @param {string} id */
async function onePlan(p, id) {
  const doc = ID.test(id) ? await RatePlanRecord.findOne({ _id: id, hotelOrgId: p.hotelOrgId, propertyId: String(p._id) }).lean() : null;
  if (!doc) throw new NotFoundError('RATE_PLAN_NOT_FOUND');
  return /** @type {any} */ (doc);
}

/** The plans following `id`. @param {any} p @param {string} id */
const childrenOf = (p, id) =>
  RatePlanRecord.find({ hotelOrgId: p.hotelOrgId, propertyId: String(p._id), 'derived.parentRatePlanId': id, status: OPEN }).lean();

/** @param {RatePlanDeps} deps @param {Ctx} ctx @param {any} p @param {{ input: RatePlanInput, selfId: string | null }} a */
async function checkedPlan(deps, ctx, p, { input, selfId }) {
  const propertyId = String(p._id);
  const parentId = input.derived?.parentRatePlanId;
  const [roomTypes, mealPlanKeys, policies, parent, children] = await Promise.all([
    deps.roomTypesOf(ctx, propertyId),
    deps.mealPlanKeys(),
    CancellationPolicyRecord.find({ hotelOrgId: p.hotelOrgId, propertyId, status: 'ACTIVE' }, { _id: 1 }).lean(),
    parentId && ID.test(parentId) ? RatePlanRecord.findOne({ _id: parentId, hotelOrgId: p.hotelOrgId, propertyId }).lean() : null,
    selfId ? childrenOf(p, selfId) : [],
  ]);
  const data = checkRatePlan(input, {
    roomTypeIds: roomTypes.map((r) => r.id),
    mealPlanKeys,
    policyIds: policies.map((x) => String(x._id)),
    parent: parent ? { ...ratePlanDto(parent) } : null,
    selfId,
    childRoomTypeIds: children.length > 0 ? [...new Set(children.flatMap((c) => c.roomTypeIds))] : null,
    childPricingModel: children[0]?.pricingModel ?? null,
  });
  return { ...data, nameKey: nameKey(data.name) };
}

/** @param {RatePlanDeps} deps */
export function createRatePlanService(deps) {
  /** @param {Ctx} ctx @param {string} propertyId */
  const editable = (ctx, propertyId) => editableProperty(deps, ctx, propertyId);
  const one = onePlan;
  /** @param {Ctx} ctx @param {any} p @param {RatePlanInput} input @param {string | null} selfId */
  const checked = (ctx, p, input, selfId) => checkedPlan(deps, ctx, p, { input, selfId });

  return {
    /** @param {Ctx} ctx @param {string} propertyId */
    async list(ctx, propertyId) {
      const p = await deps.properties.loadOwned(ctx, propertyId, PERMISSIONS.calendarRead);
      const docs = await RatePlanRecord.find({ hotelOrgId: p.hotelOrgId, propertyId, status: OPEN }).sort({ order: 1, name: 1 }).lean();
      return docs.map(ratePlanDto);
    },

    /** @param {Ctx} ctx @param {string} propertyId @param {RatePlanInput & { order?: number }} input */
    async create(ctx, propertyId, input) {
      const p = await editable(ctx, propertyId);
      const data = await checked(ctx, p, input, null);
      if ((await RatePlanRecord.countDocuments({ hotelOrgId: p.hotelOrgId, propertyId, status: OPEN })) >= MAX_RATE_PLANS_PER_PROPERTY)
        throw new DomainError('TOO_MANY_RATE_PLANS');
      const by = actorOf(ctx);
      const doc = await RatePlanRecord.create({
        ...data,
        order: input.order ?? 100,
        hotelOrgId: p.hotelOrgId,
        propertyId,
        createdBy: by,
        updatedBy: by,
      }).catch(nameTaken);
      return ratePlanDto(doc.toObject());
    },

    /** @param {Ctx} ctx @param {{ propertyId: string, id: string, data: RatePlanInput & { order?: number, status?: 'ACTIVE' | 'INACTIVE' }, version: number }} input */
    async update(ctx, input) {
      const p = await editable(ctx, input.propertyId);
      const current = await one(p, input.id);
      if (current.status === 'ARCHIVED') throw new DomainError('RATE_PLAN_ARCHIVED');
      const { status, order, ...rest } = input.data;
      const data = await checked(ctx, p, rest, input.id);
      const res = await RatePlanRecord.updateOne(
        { _id: current._id, hotelOrgId: p.hotelOrgId, version: input.version, status: OPEN },
        {
          $set: { ...data, ...(status ? { status } : {}), ...(order !== undefined ? { order } : {}), updatedBy: actorOf(ctx) },
          $inc: { version: 1 },
        },
      ).catch(nameTaken);
      if (res.modifiedCount !== 1)
        throw new AppError('VERSION_CONFLICT', 412, 'The rate plan was changed meanwhile — reload and try again');
      return ratePlanDto(await one(p, input.id));
    },

    /** Archived, never deleted; its name becomes free. @param {Ctx} ctx @param {string} propertyId @param {string} id */
    async archive(ctx, propertyId, id) {
      const p = await editable(ctx, propertyId);
      const current = await one(p, id);
      if ((await childrenOf(p, id)).length > 0) throw new ConflictError('RATE_PLAN_HAS_DERIVED');
      await RatePlanRecord.updateOne(
        { _id: current._id, hotelOrgId: p.hotelOrgId, status: OPEN },
        { $set: { status: 'ARCHIVED', nameKey: `${current.nameKey}#archived#${id}`, updatedBy: actorOf(ctx) }, $inc: { version: 1 } },
      );
    },
  };
}
