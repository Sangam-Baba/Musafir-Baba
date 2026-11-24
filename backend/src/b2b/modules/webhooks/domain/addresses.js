// @ts-check
/**
 * Where a webhook may go (plan Stage 14 §7, `03-security-baseline.md` §5): HTTPS URLs to public addresses only.
 * Private, loopback, link-local (incl. cloud metadata 169.254.169.254), carrier-grade NAT, documentation, multicast,
 * reserved and IPv6 unique-local / link-local / mapped / NAT64 ranges are refused. Pure.
 */
import { BlockList, isIP } from 'node:net';

// separate lists: Node checks IPv4 addresses against IPv6 rules as IPv4-mapped (::ffff:0:0/96 would match everything)
const BLOCKED4 = new BlockList();
const BLOCKED6 = new BlockList();
for (const [addr, bits] of /** @type {const} */ ([
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]))
  BLOCKED4.addSubnet(addr, bits, 'ipv4');
for (const [addr, bits] of /** @type {const} */ ([
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
]))
  BLOCKED6.addSubnet(addr, bits, 'ipv6');

/** Is this resolved address off limits? (Not an IP at all → off limits.) @param {string} ip */
export function isBlockedAddress(ip) {
  const family = isIP(ip);
  if (family === 4) return BLOCKED4.check(ip, 'ipv4');
  if (family !== 6) return true;
  const lower = ip.toLowerCase();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(lower);
  if (mapped) return true; // IPv4-mapped addresses are never needed for a public endpoint
  return BLOCKED6.check(lower, 'ipv6');
}

/**
 * Check an endpoint URL before saving (the address is checked again on every send).
 * @param {string} raw @returns {{ ok: true, url: URL } | { ok: false, reason: string }}
 */
export function checkEndpointUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 500) return { ok: false, reason: 'URL_TOO_LONG' };
  /** @type {URL} */
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'URL_INVALID' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'URL_NOT_HTTPS' };
  if (url.username || url.password) return { ok: false, reason: 'URL_HAS_CREDENTIALS' };
  if (privateHost(url.hostname.replace(/^\[|\]$/g, ''))) return { ok: false, reason: 'URL_PRIVATE_ADDRESS' };
  return { ok: true, url };
}

/** A name or address that can only be internal. @param {string} host */
function privateHost(host) {
  if (!host || host === 'localhost' || ['.localhost', '.local', '.internal'].some((end) => host.endsWith(end))) return true;
  return isIP(host) ? isBlockedAddress(host) : !host.includes('.');
}
