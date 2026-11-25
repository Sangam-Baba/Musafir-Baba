// @ts-check
/**
 * Public references, e.g. MBH-7K3Q-9X2D (docs/plan/04-domain-model.md §6).
 * Random (crypto) Crockford base32 — no I, L, O, U — with a final check character
 * (Luhn mod 32), so typos are caught. Never sequential. Clients must not parse them.
 */
import { randomInt } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Body length (incl. check char) and grouping per prefix. */
export const REFERENCE_FORMATS = /** @type {const} */ ({
  MBO: [4, 4], // order
  MBH: [4, 4], // hotel booking
  MBHT: [6], // property
  MBC: [6], // client organisation
  MBHO: [6], // hotel organisation (the company; its properties are MBHT)
  MBBO: [6], // bus operator company (Stage 18)
});

/** @typedef {keyof typeof REFERENCE_FORMATS} ReferencePrefix */

/**
 * @param {ReferencePrefix} prefix
 * @param {(max: number) => number} [random] for tests
 * @returns {string}
 */
export function newReference(prefix, random = randomInt) {
  const groups = REFERENCE_FORMATS[prefix];
  const length = groups.reduce((a, b) => a + b, 0);
  let body = '';
  for (let i = 0; i < length - 1; i += 1) body += ALPHABET[random(32)];
  body += checkChar(body);
  return [prefix, ...split(body, groups)].join('-');
}

/**
 * Accepts lower case and common look-alikes (O→0, I/L→1). Returns the canonical form or null.
 * @param {string} input
 * @returns {string | null}
 */
export function parseReference(input) {
  if (typeof input !== 'string' || input.length > 32) return null;
  const parts = input.trim().toUpperCase().split('-');
  const prefix = /** @type {ReferencePrefix} */ (parts[0]);
  const groups = REFERENCE_FORMATS[prefix];
  if (!groups) return null;
  const body = parts.slice(1).join('').replaceAll('O', '0').replaceAll(/[IL]/g, '1');
  const length = groups.reduce((a, b) => a + b, 0);
  if (body.length !== length || [...body].some((c) => !ALPHABET.includes(c))) return null;
  if (checkChar(body.slice(0, -1)) !== body.at(-1)) return null;
  return [prefix, ...split(body, groups)].join('-');
}

/** Luhn mod N over the base32 alphabet. @param {string} body */
function checkChar(body) {
  let sum = 0;
  let double = true;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    let v = ALPHABET.indexOf(body.charAt(i));
    if (double) {
      v *= 2;
      v = Math.floor(v / 32) + (v % 32);
    }
    sum += v;
    double = !double;
  }
  return ALPHABET.charAt((32 - (sum % 32)) % 32);
}

/** @param {string} s @param {readonly number[]} sizes */
function split(s, sizes) {
  const out = [];
  let i = 0;
  for (const n of sizes) {
    out.push(s.slice(i, i + n));
    i += n;
  }
  return out;
}
