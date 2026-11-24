// @ts-check
/**
 * Webhook endpoints, signatures and the guarded sender (S14-T04, T05).
 * - signature verifiable (the docs' receiver code); old timestamps refused; during rotation both secrets verify;
 * - SSRF suite: localhost, 127.0.0.1, 10/8, 172.16/12, 192.168/16, 169.254.169.254 (metadata), 100.64/10, 0.0.0.0,
 *   ::1, fc00::/7, fe80::/10, IPv4-mapped IPv6, http://, credentials in the URL, a name resolving to a private
 *   address, a name resolving to public + private (rebinding), redirects not followed, timeout, ≤ 1 KB kept, the
 *   connection made to the checked address with TLS for the name;
 * - endpoints: secret shown once and stored sealed, at most 5, events from the list, plan gate, rotate, remove.
 */
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  checkEndpointUrl,
  createEndpoints,
  EndpointRecord,
  guardedPost,
  isBlockedAddress,
  signatureHeader,
  verifySignature,
} from '../../src/b2b/modules/webhooks/index.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-24T06:30:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const ORG = '65f0000000000000000a1402';
const WHO = { orgId: ORG, userId: '65f0000000000000000b1402', permissions: ['webhooks.endpoint.manage'] };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
let planAllows = true;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  nowMs = Date.parse('2026-11-24T06:30:00Z');
  planAllows = true;
  await EndpointRecord.deleteMany({}).setOptions(S);
});

/**
 * A stand-in for `https.request`: records the options and answers with `status` / `body` (or never answers).
 * @param {{ status?: number, body?: string, hang?: boolean }} r @param {any[]} calls
 */
function fakeRequest(r, calls) {
  return /** @type {any} */ (
    (/** @type {any} */ options, /** @type {(res: any) => void} */ onResponse) => {
      calls.push(options);
      const req = Object.assign(new EventEmitter(), {
        destroy: () => undefined,
        end: () => {
          if (r.hang) return;
          const res = Object.assign(new PassThrough(), { statusCode: r.status ?? 200 });
          setTimeout(() => {
            onResponse(res);
            res.end(r.body ?? 'ok');
          });
        },
      });
      return req;
    }
  );
}
/** @param {string[]} addrs */
const resolvesTo = (addrs) => async () => addrs.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));

describe('signatures', () => {
  it('verifiable; too old refused; both secrets work during rotation; tampered body refused', () => {
    const body = JSON.stringify({ id: 'evt_1', type: 'booking.confirmed' });
    const t = 1_764_000_000;
    const h = signatureHeader(['whsec_new'], t, body);
    expect(h).toMatch(/^t=1764000000,v1=[a-f0-9]{64}$/);
    expect(verifySignature(h, body, 'whsec_new', t + 10)).toBe(true);
    expect(verifySignature(h, body, 'whsec_new', t + 301)).toBe(false);
    expect(verifySignature(h, `${body} `, 'whsec_new', t)).toBe(false);
    expect(verifySignature(h, body, 'whsec_other', t)).toBe(false);
    const both = signatureHeader(['whsec_new', 'whsec_old'], t, body);
    expect(verifySignature(both, body, 'whsec_old', t)).toBe(true);
    expect(verifySignature(both, body, 'whsec_new', t)).toBe(true);
    expect(verifySignature('t=abc,v1=zz', body, 'whsec_new', t)).toBe(false);
  });
});

describe('SSRF suite', () => {
  it('private, loopback, link-local, metadata, mapped and reserved addresses; bad URLs', () => {
    for (const ip of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      '::',
      'fc00::1',
      'fd00:ec2::254',
      'fe80::1',
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      '224.0.0.1',
      '255.255.255.255',
      'not-an-ip',
    ])
      expect(isBlockedAddress(ip), ip).toBe(true);
    for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '172.32.0.1']) expect(isBlockedAddress(ip), ip).toBe(false);
    for (const [url, reason] of /** @type {const} */ ([
      ['http://hooks.example.com/x', 'URL_NOT_HTTPS'],
      ['https://localhost/x', 'URL_PRIVATE_ADDRESS'],
      ['https://127.0.0.1/x', 'URL_PRIVATE_ADDRESS'],
      ['https://169.254.169.254/latest/meta-data', 'URL_PRIVATE_ADDRESS'],
      ['https://[::1]/x', 'URL_PRIVATE_ADDRESS'],
      ['https://intranet/x', 'URL_PRIVATE_ADDRESS'],
      ['https://db.internal/x', 'URL_PRIVATE_ADDRESS'],
      ['https://user:pass@hooks.example.com/x', 'URL_HAS_CREDENTIALS'],
      ['ftp://hooks.example.com', 'URL_NOT_HTTPS'],
      ['not a url', 'URL_INVALID'],
    ]))
      expect(checkEndpointUrl(url), url).toEqual({ ok: false, reason });
    expect(checkEndpointUrl('https://hooks.example.com/mb?x=1').ok).toBe(true);
  });

  it('the sender checks what the name resolves to, pins the connection, follows no redirect, times out, keeps ≤ 1 KB', async () => {
    /** @type {any[]} */
    const calls = [];
    const post = (/** @type {string} */ url, /** @type {any} */ o) => guardedPost(url, '{}', { 'MB-Signature': 't=1,v1=x' }, o);
    expect(await post('https://evil.example/x', { lookup: resolvesTo(['127.0.0.1']), request: fakeRequest({}, calls) })).toMatchObject({
      ok: false,
      error: 'ADDRESS_BLOCKED',
    });
    expect(
      await post('https://evil.example/x', { lookup: resolvesTo(['93.184.216.34', '169.254.169.254']), request: fakeRequest({}, calls) }),
    ).toMatchObject({ error: 'ADDRESS_BLOCKED' });
    expect(
      await post('https://evil.example/x', {
        lookup: async () => {
          throw new Error('ENOTFOUND');
        },
        request: fakeRequest({}, calls),
      }),
    ).toMatchObject({ error: 'DNS_FAILED' });
    expect(await post('https://169.254.169.254/latest', { request: fakeRequest({}, calls) })).toMatchObject({
      error: 'URL_PRIVATE_ADDRESS',
    });
    expect(calls).toHaveLength(0); // nothing was ever sent

    const ok = await post('https://hooks.example.com/mb?x=1', {
      lookup: resolvesTo(['93.184.216.34']),
      request: fakeRequest({ status: 200, body: 'thanks' }, calls),
    });
    expect(ok).toMatchObject({ ok: true, status: 200, snippet: 'thanks', error: null });
    expect(calls[0]).toMatchObject({ host: '93.184.216.34', servername: 'hooks.example.com', path: '/mb?x=1', method: 'POST', port: 443 });
    expect(calls[0].headers).toMatchObject({ host: 'hooks.example.com', 'MB-Signature': 't=1,v1=x', 'content-type': 'application/json' });

    expect(
      await post('https://hooks.example.com/r', {
        lookup: resolvesTo(['93.184.216.34']),
        request: fakeRequest({ status: 302, body: '' }, calls),
      }),
    ).toMatchObject({ ok: false, status: 302, error: 'REDIRECT_NOT_FOLLOWED' });
    expect(
      await post('https://hooks.example.com/big', {
        lookup: resolvesTo(['93.184.216.34']),
        request: fakeRequest({ status: 500, body: 'x'.repeat(5000) }, calls),
      }),
    ).toMatchObject({ ok: false, status: 500 });
    expect(
      (
        await post('https://hooks.example.com/big', {
          lookup: resolvesTo(['93.184.216.34']),
          request: fakeRequest({ status: 500, body: 'x'.repeat(5000) }, calls),
        })
      ).snippet,
    ).toHaveLength(1024);
    expect(
      await post('https://hooks.example.com/slow', {
        lookup: resolvesTo(['93.184.216.34']),
        request: fakeRequest({ hang: true }, calls),
        timeoutMs: 30,
      }),
    ).toMatchObject({ ok: false, error: 'TIMEOUT' });
  });
});

describe('endpoints', () => {
  it('secret once and sealed; events from the list; 5 max; plan gate; rotate keeps the old secret 24 h; update; remove', async () => {
    const eps = createEndpoints({ clock, sealKey: 'webhook-seal-key-for-tests-0001', planAllowsWebhooks: async () => planAllows });
    const e = await eps.create(WHO, {
      url: 'https://hooks.trips.co/mb',
      events: ['booking.confirmed', 'booking.cancelled'],
      description: 'Main',
    });
    expect(e.secret).toMatch(/^whsec_[A-Za-z0-9_-]{32}$/);
    const stored = /** @type {any} */ (await EndpointRecord.findOne({ _id: e.id }).setOptions(S).lean());
    expect(JSON.stringify(stored)).not.toContain(e.secret);
    expect(eps.secretsOf(stored)).toEqual([e.secret]);
    expect((await eps.list(ORG))[0]).not.toHaveProperty('secret');

    await expect(eps.create(WHO, { url: 'https://hooks.trips.co/mb', events: ['booking.exploded'] })).rejects.toMatchObject({
      code: 'EVENTS_INVALID',
    });
    await expect(eps.create(WHO, { url: 'http://hooks.trips.co/mb', events: ['booking.confirmed'] })).rejects.toMatchObject({
      code: 'URL_NOT_HTTPS',
    });
    await expect(
      eps.create({ ...WHO, permissions: [] }, { url: 'https://hooks.trips.co/mb', events: ['booking.confirmed'] }),
    ).rejects.toMatchObject({ status: 403 });
    planAllows = false;
    await expect(eps.create(WHO, { url: 'https://hooks.trips.co/2', events: ['booking.confirmed'] })).rejects.toMatchObject({
      code: 'PLAN_HAS_NO_WEBHOOKS',
    });
    planAllows = true;
    for (let i = 2; i <= 5; i += 1) await eps.create(WHO, { url: `https://hooks.trips.co/${i}`, events: ['booking.confirmed'] });
    await expect(eps.create(WHO, { url: 'https://hooks.trips.co/6', events: ['booking.confirmed'] })).rejects.toMatchObject({
      code: 'WEBHOOK_ENDPOINT_LIMIT',
    });

    const rotated = await eps.rotateSecret(ORG, e.id);
    expect(rotated.secret).not.toBe(e.secret);
    const now = /** @type {any} */ (await EndpointRecord.findOne({ _id: e.id }).setOptions(S).lean());
    expect(eps.secretsOf(now)).toEqual([rotated.secret, e.secret]);
    nowMs += 24 * 60 * 60_000 + 1;
    expect(eps.secretsOf(now)).toEqual([rotated.secret]);

    expect(await eps.update(ORG, e.id, { enabled: false })).toMatchObject({ status: 'DISABLED', disabledReason: 'BY_CLIENT' });
    expect(await eps.update(ORG, e.id, { enabled: true, events: ['payment.succeeded'] })).toMatchObject({
      status: 'ACTIVE',
      events: ['payment.succeeded'],
    });
    await expect(eps.update(ORG, e.id, { url: 'https://10.0.0.5/x' })).rejects.toMatchObject({ code: 'URL_PRIVATE_ADDRESS' });
    expect(await eps.remove(ORG, e.id)).toMatchObject({ status: 'DELETED' });
    await expect(eps.get(ORG, e.id)).rejects.toMatchObject({ code: 'WEBHOOK_ENDPOINT_NOT_FOUND' });
    await expect(eps.get('65f0000000000000000a9999', (await eps.list(ORG))[0]?.id ?? '')).rejects.toMatchObject({
      code: 'WEBHOOK_ENDPOINT_NOT_FOUND',
    });
  });
});
