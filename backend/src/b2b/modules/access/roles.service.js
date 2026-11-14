// @ts-check
/**
 * Roles of an org: the system roles for its type (from code) plus its custom roles (`acl_roles`).
 * The permission catalogue and "is this role still held by someone?" are passed in, so this module
 * never imports feature modules or the organizations module. Changes to a custom role are recorded
 * as `access.role.changed` in the same update (P5) — S01-T11 clears cached permissions on it.
 */
import { newEvent } from '../../core/db/events.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { assertCustomRolePermissions, customRoleId, customRoleRef, isCustomRoleRef, normaliseRoleName } from './domain/custom-roles.js';
import { allowedPermissions } from './domain/patterns.js';
import { resolveSystemRole, systemRole, systemRolesFor } from './domain/system-roles.js';
import { EVENTS } from './events.js';
import { RoleRecord } from './models/role.model.js';

const ID = /^[a-f0-9]{24}$/;

/** @typedef {'PLATFORM' | 'CLIENT' | 'HOTEL'} OrgType */

/** @param {import('../../core/context.js').RequestContext} ctx */
function memberOf(ctx) {
  if (ctx.actor.type !== 'member' || !ctx.actor.orgType || ctx.actor.orgType === 'PLATFORM') throw new ForbiddenError('ORG_NOT_SELECTED');
  return { orgId: ctx.actor.orgId, orgType: ctx.actor.orgType, userId: ctx.actor.userId, permissions: new Set(ctx.actor.permissions) };
}

/** @param {any} r */
const customDto = (r) => ({
  ref: customRoleRef(String(r._id)),
  kind: 'custom',
  name: r.name,
  description: r.description,
  permissions: r.permissions,
});

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, catalogue: readonly import('../../core/permissions.js').PermissionDef[],
 *   isRoleInUse: (orgId: string, roleRef: string) => Promise<boolean>, accessChanged?: (orgId: string, userId?: string) => void }} RolesDeps
 */

/**
 * Permissions of role refs in one org: system roles of that type + its active custom roles.
 * @param {RolesDeps} deps @param {readonly string[]} roles @param {OrgType} orgType @param {string} orgId @returns {Promise<string[]>}
 */
async function permissionsOfRoles(deps, roles, orgType, orgId) {
  const out = new Set();
  for (const key of roles) {
    const role = systemRole(key);
    if (role && role.orgType === orgType) for (const code of resolveSystemRole(role, deps.catalogue)) out.add(code);
  }
  const customIds = roles.filter(isCustomRoleRef).map(customRoleId);
  if (customIds.length > 0) {
    const allowed = new Set(allowedPermissions(orgType, deps.catalogue));
    for (const r of await RoleRecord.find({ orgId, _id: { $in: customIds }, status: 'ACTIVE' }, { permissions: 1 }).lean()) {
      for (const code of r.permissions) if (allowed.has(code)) out.add(code); // a code removed from the catalogue simply stops counting
    }
  }
  return [...out].sort();
}

/** @param {unknown} error */
const nameTaken = (error) => (/** @type {{ code?: number }} */ (error).code === 11000 ? new ConflictError('ROLE_NAME_TAKEN') : error);

/**
 * @param {RolesDeps} deps
 * @param {import('../../core/context.js').RequestContext} ctx
 * @param {{ name: string, description?: string, permissions: string[] }} input
 */
async function createCustomRole(deps, ctx, input) {
  const me = memberOf(ctx);
  const { name, nameKey } = normaliseRoleName(input.name);
  const permissions = assertCustomRolePermissions(input.permissions, {
    orgType: me.orgType,
    catalogue: deps.catalogue,
    actorPermissions: me.permissions,
  });
  const doc = new RoleRecord({
    orgId: me.orgId,
    orgType: me.orgType,
    name,
    nameKey,
    description: input.description?.trim() ?? '',
    permissions,
    createdBy: me.userId,
  });
  doc.set({
    pendingEvents: [newEvent(EVENTS.roleChanged, { orgId: me.orgId, roleRef: customRoleRef(String(doc._id)), change: 'created' }, deps)],
    hasPendingEvents: true,
  });
  await doc.save().catch((error) => {
    throw nameTaken(error);
  });
  return customDto(doc);
}

/**
 * @param {RolesDeps} deps
 * @param {import('../../core/context.js').RequestContext} ctx
 * @param {string} id
 * @param {{ name?: string, description?: string, permissions?: string[] }} input
 */
async function updateCustomRole(deps, ctx, id, input) {
  const me = memberOf(ctx);
  if (!ID.test(id)) throw new NotFoundError('ROLE_NOT_FOUND');
  const current = await RoleRecord.findOne({ _id: id, orgId: me.orgId, status: 'ACTIVE' }).lean();
  if (!current) throw new NotFoundError('ROLE_NOT_FOUND');
  // editing a role you couldn't create (it holds permissions you lack) is not allowed either
  if (current.permissions.some((/** @type {string} */ p) => !me.permissions.has(p)))
    throw new ForbiddenError('CANNOT_GRANT_MORE_THAN_YOU_HAVE');
  /** @type {Record<string, unknown>} */
  const set = {};
  if (input.name !== undefined) Object.assign(set, normaliseRoleName(input.name));
  if (input.description !== undefined) set.description = input.description.trim();
  if (input.permissions !== undefined) {
    set.permissions = assertCustomRolePermissions(input.permissions, {
      orgType: me.orgType,
      catalogue: deps.catalogue,
      actorPermissions: me.permissions,
    });
  }
  const event = newEvent(EVENTS.roleChanged, { orgId: me.orgId, roleRef: customRoleRef(id), change: 'updated' }, deps);
  const doc = await RoleRecord.findOneAndUpdate(
    { _id: id, orgId: me.orgId, status: 'ACTIVE' },
    { $set: { ...set, hasPendingEvents: true }, $push: { pendingEvents: event } },
    { new: true },
  )
    .lean()
    .catch((error) => {
      throw nameTaken(error);
    });
  if (!doc) throw new NotFoundError('ROLE_NOT_FOUND');
  deps.accessChanged?.(me.orgId); // everyone holding the role
  return customDto(doc);
}

/** A role still held by a member can't be deleted. @param {RolesDeps} deps @param {import('../../core/context.js').RequestContext} ctx @param {string} id */
async function deleteCustomRole(deps, ctx, id) {
  const me = memberOf(ctx);
  if (!ID.test(id)) throw new NotFoundError('ROLE_NOT_FOUND');
  if (await deps.isRoleInUse(me.orgId, customRoleRef(id))) throw new ConflictError('ROLE_IN_USE');
  const event = newEvent(EVENTS.roleChanged, { orgId: me.orgId, roleRef: customRoleRef(id), change: 'deleted' }, deps);
  const done = await RoleRecord.updateOne(
    { _id: id, orgId: me.orgId, status: 'ACTIVE' },
    { $set: { status: 'DELETED', nameKey: `deleted:${id}`, hasPendingEvents: true }, $push: { pendingEvents: event } },
  );
  if (done.modifiedCount !== 1) throw new NotFoundError('ROLE_NOT_FOUND');
  deps.accessChanged?.(me.orgId);
}

/** @param {RolesDeps} deps */
export function createRolesService(deps) {
  return {
    /** @param {readonly string[]} roles @param {OrgType} orgType @param {string} orgId */
    permissionsOf: (roles, orgType, orgId) => permissionsOfRoles(deps, roles, orgType, orgId),

    /** @param {string} ref @param {OrgType} orgType @param {string} orgId */
    async isKnownRole(ref, orgType, orgId) {
      if (isCustomRoleRef(ref)) return (await RoleRecord.countDocuments({ orgId, _id: customRoleId(ref), status: 'ACTIVE' })) === 1;
      return systemRole(ref)?.orgType === orgType;
    },

    /** @param {import('../../core/context.js').RequestContext} ctx */
    async list(ctx) {
      const me = memberOf(ctx);
      const system = systemRolesFor(me.orgType).map((r) => ({
        ref: r.key,
        kind: 'system',
        name: r.name,
        description: r.description,
        permissions: resolveSystemRole(r, deps.catalogue),
      }));
      const custom = (await RoleRecord.find({ orgId: me.orgId, status: 'ACTIVE' }).sort({ nameKey: 1 }).lean()).map(customDto);
      return [...system, ...custom];
    },

    /** Permissions that can go into a custom role in this org, grouped for the roles editor. @param {import('../../core/context.js').RequestContext} ctx */
    choosablePermissions(ctx) {
      const me = memberOf(ctx);
      return deps.catalogue
        .filter((p) => p.orgTypes.includes(me.orgType))
        .map((p) => ({ code: p.code, group: p.group, description: p.description, locked: p.sensitive || !me.permissions.has(p.code) }));
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {Parameters<typeof createCustomRole>[2]} input */
    create: (ctx, input) => createCustomRole(deps, ctx, input),
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} id @param {Parameters<typeof updateCustomRole>[3]} input */
    update: (ctx, id, input) => updateCustomRole(deps, ctx, id, input),
    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} id */
    remove: (ctx, id) => deleteCustomRole(deps, ctx, id),
  };
}
