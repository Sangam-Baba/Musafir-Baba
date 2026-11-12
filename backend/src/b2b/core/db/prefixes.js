// @ts-check
/**
 * The ONLY collection-name prefixes the B2B code may create or write
 * (docs/plan/12-protecting-the-existing-system.md, rule D1; prefix table in 01-architecture.md §4.2).
 * No existing collection uses an underscore prefix (docs/existing-system-map.md §2).
 */

export const ALLOWED_PREFIXES = /** @type {const} */ ([
  'id_', 'org_', 'acl_', 'kyc_', 'file_', 'aud_', 'htl_', 'inv_', 'prc_', 'ord_', 'hbk_', 'wal_',
  'pay_', 'ntf_', 'mtr_', 'sub_', 'bil_', 'api_', 'whk_', 'doc_', 'rpt_', 'core_', 'rt_',
]);

const VALID_NAME = /^[a-z][a-z0-9_]*$/;

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isAllowedCollection(name) {
  if (!VALID_NAME.test(name)) return false;
  return ALLOWED_PREFIXES.some((prefix) => name.startsWith(prefix) && name.length > prefix.length);
}

/**
 * @param {string} name
 * @param {string} context  where the name came from (for the error message)
 */
export function assertAllowedCollection(name, context) {
  if (!isAllowedCollection(name)) {
    throw new Error(
      `[b2b] ${context}: collection "${name}" is not allowed — B2B code may only use collections ` +
        `starting with ${ALLOWED_PREFIXES.join(', ')} (docs/plan/12-protecting-the-existing-system.md D1)`,
    );
  }
}
