// @ts-check
/**
 * The only way webhooks leave the server (plan Stage 14 §3.4, `03-security-baseline.md` §5): POST to an HTTPS URL
 * after resolving its name and refusing private / loopback / link-local / metadata addresses; the connection goes to
 * the address that was checked (so a name can't switch to an internal address between check and call — DNS
 * rebinding), TLS still verified against the name; redirects are not followed (a 3xx is a failure); 10 s timeout;
 * at most 1 KB of the response is kept. Never throws — returns what happened.
 */
import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

import { checkEndpointUrl, isBlockedAddress } from './domain/addresses.js';

export const SEND_TIMEOUT_MS = 10_000;
export const SNIPPET_BYTES = 1024;

/**
 * @typedef {{ ok: boolean, status: number | null, snippet: string, error: string | null, ms: number }} SendResult
 * @typedef {{ lookup?: (host: string, o: { all: true, verbatim: true }) => Promise<{ address: string, family: number }[]>,
 *   request?: typeof httpsRequest, timeoutMs?: number, now?: () => number }} SendOptions
 */

/** @param {string} host @param {SendOptions} o @returns {Promise<{ address: string, family: number }[] | null>} */
async function addressesOf(host, o) {
  if (isIP(host)) return [{ address: host, family: isIP(host) }];
  try {
    return /** @type {{ address: string, family: number }[]} */ (await (o.lookup ?? dnsLookup)(host, { all: true, verbatim: true }));
  } catch {
    return null;
  }
}

/**
 * @param {string} rawUrl @param {string} body @param {Record<string, string>} headers @param {SendOptions} [o]
 * @returns {Promise<SendResult>}
 */
export async function guardedPost(rawUrl, body, headers, o = {}) {
  const now = o.now ?? Date.now;
  const started = now();
  const fail = (/** @type {string} */ error) => ({ ok: false, status: null, snippet: '', error, ms: now() - started });
  const checked = checkEndpointUrl(rawUrl);
  if (!checked.ok) return fail(checked.reason);
  const host = checked.url.hostname.replace(/^\[|\]$/g, '');
  const addresses = await addressesOf(host, o);
  if (!addresses || addresses.length === 0) return fail('DNS_FAILED');
  if (addresses.some((a) => isBlockedAddress(a.address))) return fail('ADDRESS_BLOCKED'); // any private answer → refuse
  const pinned = /** @type {{ address: string, family: number }} */ (addresses[0]);
  return send({ url: checked.url, host, address: pinned.address, body, headers }, { ...o, started, now });
}

/**
 * @param {{ url: URL, host: string, address: string, body: string, headers: Record<string, string> }} t
 * @param {SendOptions & { started: number, now: () => number }} o @returns {Promise<SendResult>}
 */
function send({ url, host, address, body, headers }, o) {
  const timeoutMs = o.timeoutMs ?? SEND_TIMEOUT_MS;
  return new Promise((resolve) => {
    let done = false;
    const finish = (/** @type {Omit<SendResult, 'ms'>} */ r) => {
      if (done) return;
      done = true;
      clearTimeout(hard);
      resolve({ ...r, ms: o.now() - o.started });
    };
    const req = (o.request ?? httpsRequest)(
      {
        host: address,
        port: url.port ? Number(url.port) : 443,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        servername: isIP(host) ? undefined : host,
        headers: {
          ...headers,
          host: url.host,
          'content-type': 'application/json',
          'content-length': String(Buffer.byteLength(body)),
          'user-agent': 'MusafirBaba-Webhooks/1.0',
        },
      },
      (res) => {
        const chunks = /** @type {Buffer[]} */ ([]);
        let size = 0;
        const status = res.statusCode ?? 0;
        const end = () =>
          finish({
            ok: status >= 200 && status < 300,
            status,
            snippet: Buffer.concat(chunks).toString('utf8').slice(0, SNIPPET_BYTES),
            error: status >= 300 && status < 400 ? 'REDIRECT_NOT_FOLLOWED' : null,
          });
        res.on('data', (/** @type {Buffer} */ c) => {
          if (size < SNIPPET_BYTES) chunks.push(c.subarray(0, SNIPPET_BYTES - size));
          size += c.length;
          if (size >= SNIPPET_BYTES) {
            end();
            res.destroy();
          }
        });
        res.on('end', end);
        res.on('error', end);
      },
    );
    const hard = setTimeout(() => {
      req.destroy();
      finish({ ok: false, status: null, snippet: '', error: 'TIMEOUT' });
    }, timeoutMs);
    hard.unref?.();
    req.on('error', () => finish({ ok: false, status: null, snippet: '', error: 'CONNECT_FAILED' }));
    req.end(body);
  });
}
