// @ts-check
/**
 * What a set of role keys allows in an org of a given type — system roles resolved against the
 * permission catalogue (custom roles join in S01-T10). Lives in the routes layer because it joins the
 * access module with the catalogue of all modules.
 */
import { resolveSystemRole, systemRole } from '../modules/access/index.js';
import { PERMISSION_CATALOGUE } from '../permission-catalogue.js';

/** @typedef {'PLATFORM' | 'CLIENT' | 'HOTEL'} OrgType */

/** @param {string} key @param {OrgType} orgType */
export const isKnownRole = (key, orgType) => systemRole(key)?.orgType === orgType;

/**
 * @param {readonly string[]} roles
 * @param {OrgType} orgType
 * @returns {string[]} sorted, unique
 */
export function permissionsOfRoles(roles, orgType) {
  const out = new Set();
  for (const key of roles) {
    const role = systemRole(key);
    if (role && role.orgType === orgType) for (const code of resolveSystemRole(role, PERMISSION_CATALOGUE)) out.add(code);
  }
  return [...out].sort();
}
