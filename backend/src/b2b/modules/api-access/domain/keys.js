// @ts-check
/**
 * API key rules (plan Stage 14 §3.1) — pure: the key format, scopes and what each scope lets a key do, the secret's
 * hash, and the IP allow-list (single addresses or CIDR ranges, IPv4 and IPv6).
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { BlockList, isIP } from 'node:net';

export const KEY_ENVS = /** @type {const} */ (['live', 'test']);
export const SCOPES = /** @type {const} */ ([
  'hotel:search',
  'hotel:book',
  'orders:read',
  'wallet:read',
  'webhooks:manage',
  'bus:search',
  'bus:book',
]);
export const MAX_ACTIVE_KEYS = 2;
export const MAX_IPS = 20;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const KEY_RE = /^mb_(live|test)_([A-Za-z0-9]{8})_([A-Za-z0-9]{40})$/;

/**
 * What each scope lets a key do: the permission the creator must hold to give the scope, and the permission patterns
 * the key may use (always cut down to what the creator holds at the time of the call).
 * @type {Record<typeof SCOPES[number], { requires: string, patterns: string[] }>}
 */
export const SCOPE_RULES = {
  'hotel:search': { requires: 'hotel-search.search.use', patterns: ['hotel-search.**', 'hotel-catalog.**.read', 'pricing.**.read'] },
  'hotel:book': { requires: 'orders.order.create', patterns: ['orders.order.create', 'orders.order.read', 'hotel-booking.**'] },
  'orders:read': { requires: 'orders.order.read', patterns: ['orders.**.read', 'hotel-booking.**.read'] },
  'wallet:read': { requires: 'wallet.account.read', patterns: ['wallet.account.read', 'wallet.statement.read'] },
  'webhooks:manage': { requires: 'webhooks.endpoint.manage', patterns: ['webhooks.**'] },
  // Stage 18 B8: buses (bus orders also need the search permission — the bus search gate checks it)
  'bus:search': { requires: 'bus-booking.search.use', patterns: ['bus-booking.search.use'] },
  'bus:book': { requires: 'orders.order.create', patterns: ['orders.order.create', 'orders.order.read', 'bus-booking.search.use'] },
};

/** A key's text from random bytes (unbiased: bytes ≥ 232 are skipped). @param {(n: number) => Buffer} random @param {number} length */
export function randomText(random, length) {
  let out = '';
  while (out.length < length) for (const b of random(length * 2)) if (b < 232 && out.length < length) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** @param {'live' | 'test'} env @param {string} prefix @param {string} secret */
export const formatKey = (env, prefix, secret) => `mb_${env}_${prefix}_${secret}`;

/** @param {unknown} token @returns {{ env: 'live' | 'test', prefix: string, secret: string } | null} */
export function parseKey(token) {
  const m = typeof token === 'string' ? KEY_RE.exec(token) : null;
  return m
    ? { env: /** @type {'live' | 'test'} */ (m[1]), prefix: /** @type {string} */ (m[2]), secret: /** @type {string} */ (m[3]) }
    : null;
}

/** @param {string} secret @param {string} pepper */
export const hashSecret = (secret, pepper) => createHash('sha256').update(`${secret}.${pepper}`).digest('hex');

/** @param {string} secret @param {string} pepper @param {string} storedHash */
export function secretMatches(secret, pepper, storedHash) {
  const a = Buffer.from(hashSecret(secret, pepper), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** One allow-list entry (`203.0.113.7`, `203.0.113.0/24`, `2001:db8::/32`) or null. @param {string} entry */
export function parseCidr(entry) {
  const [addr = '', bits, extra] = entry.trim().split('/');
  const family = isIP(addr);
  if (!family || extra !== undefined) return null;
  const max = family === 4 ? 32 : 128;
  const n = bits === undefined ? max : /^\d{1,3}$/.test(bits) ? Number(bits) : -1;
  return n >= 0 && n <= max ? { addr, bits: n, type: /** @type {'ipv4' | 'ipv6'} */ (family === 4 ? 'ipv4' : 'ipv6') } : null;
}

/** Normalised allow-list and the entries that are not addresses / ranges. @param {string[]} list */
export function normaliseAllowList(list) {
  const entries = [...new Set(list.map((e) => e.trim()).filter(Boolean))];
  const bad = entries.filter((e) => !parseCidr(e));
  const good = entries.flatMap((e) => {
    const c = parseCidr(e);
    return c ? [`${c.addr}/${c.bits}`] : [];
  });
  return { list: good, bad, tooLong: entries.length > MAX_IPS };
}

/** Is the caller's IP allowed? Empty list = any IP. `::ffff:1.2.3.4` counts as `1.2.3.4`. @param {string} ip @param {string[]} list */
export function ipAllowed(ip, list) {
  if (list.length === 0) return true;
  const plain = ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
  const family = isIP(plain);
  if (!family) return false;
  const block = new BlockList();
  for (const e of list) {
    const c = parseCidr(e);
    if (c) block.addSubnet(c.addr, c.bits, c.type);
  }
  return block.check(plain, family === 4 ? 'ipv4' : 'ipv6');
}

/** Scopes the creator may give (each scope's required permission held). @param {readonly string[]} scopes @param {readonly string[]} permissions */
export const scopesAllowed = (scopes, permissions) =>
  scopes.every((s) => permissions.includes(SCOPE_RULES[/** @type {typeof SCOPES[number]} */ (s)]?.requires ?? '\0'));
