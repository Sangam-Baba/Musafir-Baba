// @ts-check
/**
 * Rules for custom roles (plan Stage 01 §3.3, §7, §8 "privilege escalation via custom role"). Pure.
 * A custom role may contain only permissions that:
 *  - the org type may hold (so never `platform.*` / `admin.*` in client or hotel orgs),
 *  - are not sensitive (sensitive ones need admin approval — not offered in v1),
 *  - the person creating or editing the role holds themselves.
 */
import { DomainError, ForbiddenError } from '../../../core/errors.js';

export const CUSTOM_ROLE_PREFIX = 'custom:';
const CUSTOM_REF = /^custom:[a-f0-9]{24}$/;

/** @param {string} ref */
export const isCustomRoleRef = (ref) => CUSTOM_REF.test(ref);
/** @param {string} id */
export const customRoleRef = (id) => `${CUSTOM_ROLE_PREFIX}${id}`;
/** @param {string} ref */
export const customRoleId = (ref) => ref.slice(CUSTOM_ROLE_PREFIX.length);

/** @param {string} name */
export function normaliseRoleName(name) {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length < 2 || clean.length > 60) throw new DomainError('ROLE_NAME_INVALID');
  return { name: clean, nameKey: clean.toLowerCase() };
}

/**
 * @param {readonly string[]} permissions
 * @param {{ orgType: import('../../../core/permissions.js').OrgType, catalogue: readonly import('../../../core/permissions.js').PermissionDef[], actorPermissions: ReadonlySet<string> }} context
 * @returns {string[]} sorted, unique
 */
export function assertCustomRolePermissions(permissions, context) {
  const unique = [...new Set(permissions)].sort();
  if (unique.length === 0) throw new DomainError('ROLE_NEEDS_PERMISSIONS');
  const byCode = new Map(context.catalogue.map((p) => [p.code, p]));
  for (const code of unique) {
    const def = byCode.get(code);
    if (!def || !def.orgTypes.includes(context.orgType)) throw new DomainError('PERMISSION_NOT_ALLOWED', { permission: code });
    if (def.sensitive) throw new DomainError('PERMISSION_SENSITIVE', { permission: code });
    if (!context.actorPermissions.has(code)) throw new ForbiddenError('CANNOT_GRANT_MORE_THAN_YOU_HAVE');
  }
  return unique;
}
