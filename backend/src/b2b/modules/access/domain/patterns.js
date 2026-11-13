// @ts-check
/**
 * Permission patterns used by role definitions. Pure — no Express, no Mongoose.
 * A pattern is a permission code where `*` matches exactly one part and `**` matches any number
 * of parts (including none): `organizations.**`, `hotel-booking.**.read`, `**`.
 */

/**
 * @param {string} code e.g. 'organizations.member.invite'
 * @param {string} pattern e.g. 'organizations.**'
 * @returns {boolean}
 */
export function matchesPattern(code, pattern) {
  return matchParts(code.split('.'), pattern.split('.'));
}

/** @param {string[]} code @param {string[]} pattern @returns {boolean} */
function matchParts(code, pattern) {
  if (pattern.length === 0) return code.length === 0;
  const [head, ...rest] = pattern;
  if (head === '**') {
    for (let i = 0; i <= code.length; i += 1) if (matchParts(code.slice(i), rest)) return true;
    return false;
  }
  if (code.length === 0) return false;
  return (head === '*' || head === code[0]) && matchParts(code.slice(1), rest);
}

/**
 * Permissions an organisation of this type may ever hold.
 * @param {import('../../../core/permissions.js').OrgType} orgType
 * @param {readonly import('../../../core/permissions.js').PermissionDef[]} catalogue
 * @returns {string[]} sorted codes
 */
export function allowedPermissions(orgType, catalogue) {
  return catalogue
    .filter((p) => p.orgTypes.includes(orgType))
    .map((p) => p.code)
    .sort();
}

/**
 * Codes granted by `patterns`, limited to what `orgType` may hold.
 * Safe by default: a wildcard pattern never grants a SENSITIVE permission (bank details, payouts,
 * view-as, suspending orgs…). Those need their exact code in the role, or `**` (owners, Super Admin).
 * @param {readonly string[]} patterns
 * @param {import('../../../core/permissions.js').OrgType} orgType
 * @param {readonly import('../../../core/permissions.js').PermissionDef[]} catalogue
 * @returns {string[]} sorted codes
 */
export function resolvePatterns(patterns, orgType, catalogue) {
  return catalogue
    .filter((p) => p.orgTypes.includes(orgType))
    .filter((p) =>
      patterns.some((pattern) => matchesPattern(p.code, pattern) && (!p.sensitive || pattern === '**' || !pattern.includes('*'))),
    )
    .map((p) => p.code)
    .sort();
}
