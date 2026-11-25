// @ts-check
/**
 * How modules declare permissions (docs/plan/stages/stage-01-orgs-users-roles.md §3.3).
 * Each module's `permissions.js` calls definePermissions(); the catalogue (`../permission-catalogue.js`)
 * collects them and the access module seeds `acl_permissions`, builds system roles and checks custom roles.
 * - `orgTypes`: which kinds of organisation may ever hold the permission (PLATFORM = MusafirBaba staff).
 * - `sensitive`: may not be put into a custom role without admin approval (plan §7).
 */

export const ORG_TYPES = /** @type {const} */ (['PLATFORM', 'CLIENT', 'HOTEL', 'BUS_OPERATOR']); // BUS_OPERATOR: Stage 18

/** @typedef {typeof ORG_TYPES[number]} OrgType */
/** @typedef {{ code: string, group: string, description: string, orgTypes: readonly OrgType[], sensitive: boolean }} PermissionDef */

const CODE = /^[a-z][a-z-]*(\.[a-z][a-zA-Z]*){2,3}$/;

/**
 * @template {string} K
 * @param {string} group shown as a heading in the roles editor, e.g. 'Team'
 * @param {Record<K, { code: string, description: string, orgTypes: readonly OrgType[], sensitive?: boolean }>} defs
 * @returns {{ codes: Readonly<Record<K, string>>, catalogue: readonly PermissionDef[] }}
 */
export function definePermissions(group, defs) {
  /** @type {Record<string, string>} */
  const codes = {};
  /** @type {PermissionDef[]} */
  const catalogue = [];
  for (const [key, def] of /** @type {[K, (typeof defs)[K]][]} */ (Object.entries(defs))) {
    if (!CODE.test(def.code)) throw new Error(`[b2b] permission "${def.code}" must look like module.entity.action`);
    if (def.orgTypes.length === 0 || def.orgTypes.some((t) => !ORG_TYPES.includes(t))) {
      throw new Error(`[b2b] permission "${def.code}" needs orgTypes from ${ORG_TYPES.join(', ')}`);
    }
    if (def.description.trim().length < 8) throw new Error(`[b2b] permission "${def.code}" needs a description people can read`);
    codes[key] = def.code;
    catalogue.push(
      Object.freeze({ code: def.code, group, description: def.description, orgTypes: def.orgTypes, sensitive: def.sensitive ?? false }),
    );
  }
  return { codes: /** @type {Readonly<Record<K, string>>} */ (Object.freeze(codes)), catalogue: Object.freeze(catalogue) };
}

/**
 * Joins module catalogues; refuses duplicate codes.
 * @param {readonly (readonly PermissionDef[])[]} parts
 * @returns {readonly PermissionDef[]}
 */
export function mergeCatalogues(parts) {
  /** @type {Map<string, PermissionDef>} */
  const all = new Map();
  for (const def of parts.flat()) {
    if (all.has(def.code)) throw new Error(`[b2b] permission "${def.code}" declared twice`);
    all.set(def.code, def);
  }
  return Object.freeze([...all.values()]);
}
