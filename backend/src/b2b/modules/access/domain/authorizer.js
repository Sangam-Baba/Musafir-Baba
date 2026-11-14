// @ts-check
/**
 * The authorizer (plan Stage 01 §3.4): one answer for "may this caller do X to this record?".
 * Pure — no database. Routes check the permission code first (`requirePermission`); services call
 * `authz.assert(ctx, permission, record)` after loading a record, and use `authz.scopeFilter()` for lists.
 *
 * - not signed in → 401; signed in but without the permission → 403 PERMISSION_DENIED;
 * - the record is another org's, outside the member's branches or properties, or (own-only members)
 *   created by someone else → 404, exactly like a record that doesn't exist (nothing leaks);
 * - MusafirBaba staff act platform-wide with their own permissions;
 * - website customers only reach records that carry their own customerId.
 */
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../../core/errors.js';

/** @typedef {{ orgId?: string | null, branchId?: string | null, propertyId?: string | null, createdBy?: string | null, customerId?: string | null }} RecordOwnership */
/** @typedef {{ orgField?: string, branchField?: string, propertyField?: string, createdByField?: string }} ScopeFields */

/** @param {import('../../../core/context.js').RequestContext} ctx @param {string} permission */
export function can(ctx, permission) {
  const a = ctx.actor;
  return (a.type === 'member' || a.type === 'staff') && a.permissions.includes(permission);
}

/**
 * A member's limits against the record: other org, branch or property outside their list, or someone
 * else's record for own-only members → 404.
 * @param {Extract<import('../../../core/context.js').Actor, { type: 'member' }>} a @param {RecordOwnership} record
 */
function assertWithinLimits(a, record) {
  const outside = (/** @type {readonly string[] | undefined} */ allowed, /** @type {string | null | undefined} */ value) =>
    Boolean(allowed?.length) && value !== undefined && (!value || !allowed?.includes(value));
  if (record.orgId !== undefined && record.orgId !== a.orgId) throw new NotFoundError();
  if (outside(a.branchIds, record.branchId) || outside(a.propertyIds, record.propertyId)) throw new NotFoundError();
  if (a.ownOnly && record.createdBy !== undefined && record.createdBy !== a.userId) throw new NotFoundError();
}

/** @param {string} customerId @param {string | null} permission @param {RecordOwnership} record */
function assertCustomerRecord(customerId, permission, record) {
  if (permission !== null || !record.customerId || record.customerId !== customerId) throw new NotFoundError();
}

/**
 * @param {import('../../../core/context.js').RequestContext} ctx
 * @param {string | null} permission null = only the ownership checks (e.g. a customer's own booking)
 * @param {RecordOwnership} [record] what the loaded record says about its owner
 */
export function assert(ctx, permission, record = {}) {
  const a = ctx.actor;
  switch (a.type) {
    case 'anonymous':
      throw new UnauthorizedError();
    case 'system':
      return;
    case 'customer':
      return assertCustomerRecord(a.customerId, permission, record);
    case 'user':
      throw new ForbiddenError('ORG_NOT_SELECTED');
    default:
      if (permission !== null && !a.permissions.includes(permission)) throw new ForbiddenError('PERMISSION_DENIED');
      if (a.type === 'member') assertWithinLimits(a, record);
  }
}

/**
 * MongoDB filter that limits a list to what the member may see (their org, branches, properties,
 * own records). Field names default to orgId / branchId / propertyId / createdBy; pass null-free
 * names that the collection actually has. Staff and system: no limits.
 * @param {import('../../../core/context.js').RequestContext} ctx
 * @param {ScopeFields} [fields]
 * @returns {Record<string, unknown>}
 */
export function scopeFilter(ctx, fields = {}) {
  const a = ctx.actor;
  if (a.type === 'staff' || a.type === 'system') return {};
  if (a.type !== 'member') throw a.type === 'anonymous' ? new UnauthorizedError() : new ForbiddenError('ORG_NOT_SELECTED');
  /** @type {Record<string, unknown>} */
  const filter = { [fields.orgField ?? 'orgId']: a.orgId };
  if (fields.branchField && a.branchIds?.length) filter[fields.branchField] = { $in: [...a.branchIds] };
  if (fields.propertyField && a.propertyIds?.length) filter[fields.propertyField] = { $in: [...a.propertyIds] };
  if (fields.createdByField && a.ownOnly) filter[fields.createdByField] = a.userId;
  return filter;
}

export const authz = Object.freeze({ assert, can, scopeFilter });
