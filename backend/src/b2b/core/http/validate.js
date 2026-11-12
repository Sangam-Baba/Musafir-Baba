// @ts-check
/**
 * Request validation for /api/v1 (docs/plan/02-… §5 "Query safety", 10-coding-standards.md).
 * - Every input goes through a zod schema (use z.strictObject: unknown keys are refused).
 * - Before zod, any key that starts with "$", contains "." or is a prototype key is refused
 *   at any depth — the NoSQL-injection shapes. (Global `sanitizeFilter` is NOT used.)
 * - Parsed input is put on `res.locals.input`; controllers never read req.body/req.query.
 */
import { ValidationError } from '../errors.js';

const FORBIDDEN_KEY = /^\$|\.|^(__proto__|constructor|prototype)$/;
const MAX_DEPTH = 20;
const MAX_KEYS = 2000;

/**
 * Returns the path of the first forbidden key, or null.
 * @param {unknown} value
 * @returns {string | null}
 */
export function findForbiddenKey(value) {
  let seen = 0;
  /** @param {unknown} v @param {string} path @param {number} depth @returns {string | null} */
  const walk = (v, path, depth) => {
    if (v === null || typeof v !== 'object') return null;
    if (depth > MAX_DEPTH) return `${path} (too deep)`;
    for (const key of Object.keys(v)) {
      seen += 1;
      if (seen > MAX_KEYS) return `${path} (too many keys)`;
      const here = path ? `${path}.${key}` : key;
      if (FORBIDDEN_KEY.test(key)) return here;
      const found = walk(/** @type {Record<string, unknown>} */ (v)[key], here, depth + 1);
      if (found) return found;
    }
    return null;
  };
  return walk(value, '', 0);
}

/**
 * @typedef {{ body?: import('zod').ZodType, query?: import('zod').ZodType, params?: import('zod').ZodType }} RequestSchemas
 * @typedef {{ body?: unknown, query?: unknown, params?: unknown }} ValidatedInput
 */

/**
 * @param {RequestSchemas} schemas
 * @returns {import('express').RequestHandler}
 */
export function validate(schemas) {
  return (req, res, next) => {
    /** @type {ValidatedInput} */
    const input = {};
    /** @type {{ path: string, message: string, code: string }[]} */
    const errors = [];
    for (const part of /** @type {const} */ (['params', 'query', 'body'])) {
      const schema = schemas[part];
      if (!schema) continue;
      const raw = req[part] ?? {};
      const forbidden = findForbiddenKey(raw);
      if (forbidden) {
        errors.push({ path: `${part}.${forbidden}`, message: 'This key is not allowed', code: 'forbidden_key' });
        continue;
      }
      const result = schema.safeParse(raw);
      if (result.success) input[part] = result.data;
      else errors.push(...result.error.issues.map((i) => ({ path: [part, ...i.path].join('.'), message: i.message, code: i.code })));
    }
    if (errors.length > 0) return next(new ValidationError({ errors }));
    res.locals.input = input;
    next();
  };
}
