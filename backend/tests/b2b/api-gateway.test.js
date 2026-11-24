// @ts-check
/**
 * Key sign-in (S14-T03) over HTTP: a key acts as its creator cut down to its scopes (search with `hotel:search`;
 * no bookings list without `orders:read`; never pages outside its scopes); searches count as B2B_API usage
 * per key with no free refresh; IP allow-list; revoked → refused within 5 s (at once in this process); company
 * suspended → refused; test keys on live and garbage → 401; switched off → 401 API_NOT_ENABLED.
 */
import { describe, expect, it } from 'vitest';

import { ApiKeyRecord } from '../../src/b2b/modules/api-access/index.js';
import { UsageEventRecord } from '../../src/b2b/modules/metering/index.js';
import { MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { apiKeysFor, createApiKeyAuthenticator, forgetCachedKeys, KEY_CACHE_MS } from '../../src/b2b/routes/api-keys-wiring.js';
import { usageRecorder } from '../../src/b2b/routes/metering-wiring.js';
import { auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner, seedPricing, sellableHotel } from './helpers/search-setup.js';

let nowMs = Date.parse('2026-11-24T06:30:00Z');
const clock = { now: () => new Date(nowMs) };
const ENV = { B2B_API_ENABLED: 'true', B2B_API_KEY_PEPPER: 'api-gateway-test-pepper-0001' };
const app = useInventoryApp({ clock, models: [ApiKeyRecord, UsageEventRecord], env: ENV });
const stay = { checkIn: '2026-12-01', checkOut: '2026-12-02', rooms: [{ adults: 2, childrenAges: [] }] };
const OWNER_PERMS = ['api-access.key.manage', 'hotel-search.search.use', 'orders.order.create', 'orders.order.read', 'wallet.account.read'];
const tick = () => new Promise((r) => setTimeout(r, 50));

/** A client with its Owner and two keys (search only; read only). @param {string} email */
async function clientWithKeys(email) {
  const c = await clientOwner(app, email);
  const m = /** @type {any} */ (await MemberRecord.findOne({ orgId: c.orgId }).setOptions(SYSTEM).lean());
  const keys = apiKeysFor(ENV, clock);
  const who = { orgId: c.orgId, userId: m.userId, permissions: OWNER_PERMS };
  const search = await keys.create(who, { name: 'Search engine', scopes: ['hotel:search'] });
  const reader = await keys.create(who, { name: 'Back office', scopes: ['orders:read'], ipAllowList: ['127.0.0.1', '::1'] });
  return { ...c, keys, search, reader };
}

describe('key sign-in', () => {
  it('scopes decide what a key may do; searches count as API usage per key; never pages outside its scopes', async () => {
    nowMs = Date.parse('2026-11-24T06:30:00Z');
    await seedPricing(clock);
    const h = await sellableHotel(app);
    const c = await clientWithKeys('api-gw@trips.in');
    await tick();
    await usageRecorder(clock).flush();
    await UsageEventRecord.deleteMany({}).setOptions(SYSTEM);

    const s = await app.srv.post('/api/v1/hotels/search', { destination: { type: 'CITY', id: h.cityId }, ...stay }, auth(c.search.key));
    expect(s.status).toBe(200);
    expect(s.body.items[0].from.totalPaise).toBeGreaterThan(0); // B2B prices
    expect((await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, { ...auth(c.search.key), 'x-mb-refresh': 'realtime' })).status).toBe(
      200,
    );
    expect((await app.srv.get('/api/v1/client/bookings', auth(c.search.key))).status).toBe(403); // no orders:read
    expect((await app.srv.get('/api/v1/client/bookings', auth(c.reader.key))).status).toBe(200);
    expect(
      (await app.srv.post('/api/v1/hotels/search', { destination: { type: 'CITY', id: h.cityId }, ...stay }, auth(c.reader.key))).status,
    ).toBe(403);
    expect((await app.srv.get('/api/v1/usage', auth(c.reader.key))).status).toBe(403); // usage is not a key scope
    expect((await app.srv.get('/api/v1/usage', auth(c.token))).status).toBe(200); // the Owner signed in normally still can

    await tick();
    await usageRecorder(clock).flush();
    const events = await UsageEventRecord.find({ orgId: c.orgId }).setOptions(SYSTEM).lean();
    expect(events.map((e) => [e.metric, e.channel, e.billable])).toEqual([
      ['hotel.search', 'B2B_API', true],
      ['hotel.offers', 'B2B_API', true], // the refresh header is not honoured for keys
    ]);
    expect(events.every((e) => e.userId === `apikey:${c.search.id}` && e.apiKeyId === c.search.id)).toBe(true);
    const used = /** @type {any} */ (await ApiKeyRecord.findOne({ prefix: c.search.prefix }).setOptions(SYSTEM).lean());
    expect(used.lastUsedAt).not.toBeNull();
  });

  it('IP allow-list; revoked → refused at once here and within 5 s elsewhere; company suspended → refused; bad keys → 401', async () => {
    nowMs = Date.parse('2026-11-24T06:30:00Z');
    const c = await clientWithKeys('api-gw2@trips.in');
    expect((await app.srv.get('/api/v1/client/bookings', auth(c.reader.key))).status).toBe(200);
    await c.keys.update(c.orgId, c.reader.id, { ipAllowList: ['203.0.113.0/24'] });
    nowMs += KEY_CACHE_MS + 1;
    const blocked = await app.srv.get('/api/v1/client/bookings', auth(c.reader.key));
    expect([blocked.status, blocked.body.code]).toEqual([403, 'API_KEY_IP_NOT_ALLOWED']);

    expect((await app.srv.get('/api/v1/client/bookings', { authorization: `Bearer ${c.search.key}` })).status).toBe(403); // signed in, wrong scope
    await c.keys.revoke(c.orgId, 'user:x', c.search.id);
    const cached = await app.srv.post('/api/v1/hotels/search', {}, auth(c.search.key)); // cache may still hold it ≤ 5 s
    expect([400, 401]).toContain(cached.status);
    nowMs += KEY_CACHE_MS + 1;
    expect((await app.srv.post('/api/v1/hotels/search', {}, auth(c.search.key))).body.code).toBe('API_KEY_INVALID');

    const fresh = await c.keys.create(
      {
        orgId: c.orgId,
        userId: /** @type {any} */ (await MemberRecord.findOne({ orgId: c.orgId }).setOptions(SYSTEM).lean()).userId,
        permissions: OWNER_PERMS,
      },
      { name: 'New', scopes: ['orders:read'] },
    );
    expect((await app.srv.get('/api/v1/client/bookings', auth(fresh.key))).status).toBe(200);
    await c.keys.revoke(c.orgId, 'user:x', fresh.id);
    forgetCachedKeys(); // what the revoke route does in the same process
    expect((await app.srv.get('/api/v1/client/bookings', auth(fresh.key))).status).toBe(401);

    const again = await c.keys.create(
      {
        orgId: c.orgId,
        userId: /** @type {any} */ (await MemberRecord.findOne({ orgId: c.orgId }).setOptions(SYSTEM).lean()).userId,
        permissions: OWNER_PERMS,
      },
      { name: 'Again', scopes: ['orders:read'] },
    );
    await OrganizationRecord.updateOne({ _id: c.orgId }, { $set: { status: 'SUSPENDED' } }).setOptions(SYSTEM);
    nowMs += 120_000; // past the member cache
    forgetCachedKeys();
    expect((await app.srv.get('/api/v1/client/bookings', auth(again.key))).status).toBe(401);

    expect((await app.srv.get('/api/v1/client/bookings', auth(again.key.replace('mb_live_', 'mb_test_')))).status).toBe(401);
    expect((await app.srv.get('/api/v1/client/bookings', auth('mb_live_garbage'))).status).toBe(401);
  });

  it('switched off: a key is refused with API_NOT_ENABLED; other tokens are left to the other sign-ins', async () => {
    const authenticate = createApiKeyAuthenticator({ env: {}, clock, keys: apiKeysFor(ENV, clock), resolveMember: async () => null });
    const req = (/** @type {string} */ h) =>
      /** @type {any} */ ({ get: (/** @type {string} */ n) => (n === 'authorization' ? h : undefined), ip: '127.0.0.1', socket: {} });
    await expect(authenticate(req(`Bearer mb_live_ABCDEFGH_${'x'.repeat(40)}`))).rejects.toMatchObject({
      code: 'API_NOT_ENABLED',
      status: 401,
    });
    expect(await authenticate(req('Bearer eyJhbGciOi.some.jwt'))).toBeNull();
    expect(await authenticate(req(''))).toBeNull();
  });
});
