// @ts-check
/**
 * API keys (S14-T02): format and parsing; the secret stored only as a hash (constant-time check, pepper needed);
 * scopes only if the creator holds each scope's permission and the plan allows the API; at most 2 lasting keys;
 * shown once; rotate (old key works 24 h, then stops); revoke; IP allow-list (IPv4 / IPv6 / CIDR); wrong environment,
 * unknown prefix, wrong secret → no key; last use and new IPs recorded.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  ApiKeyRecord,
  createApiKeys,
  ipAllowed,
  normaliseAllowList,
  parseKey,
  scopesAllowed,
} from '../../src/b2b/modules/api-access/index.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-24T06:30:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const ORG = '65f0000000000000000a1401';
const OWNER = {
  orgId: ORG,
  userId: '65f0000000000000000b1401',
  permissions: ['api-access.key.manage', 'hotel-search.search.use', 'orders.order.create', 'orders.order.read', 'wallet.account.read'],
};
const PEPPER = 'pepper-long-enough-for-tests';
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
  await ApiKeyRecord.deleteMany({}).setOptions(S);
});

/** @param {'live' | 'test'} [env] */
const keys = (env = 'live') => createApiKeys({ clock, pepper: PEPPER, env, planAllowsApi: async () => planAllows });

describe('rules (pure)', () => {
  it('format, scopes, allow-list', () => {
    expect(parseKey(`mb_live_ABCDEFGH_${'x'.repeat(40)}`)).toEqual({ env: 'live', prefix: 'ABCDEFGH', secret: 'x'.repeat(40) });
    for (const bad of ['mb_live_ABC_x', `mb_prod_ABCDEFGH_${'x'.repeat(40)}`, `Bearer mb_live_ABCDEFGH_${'x'.repeat(40)}`, null, 42])
      expect(parseKey(bad)).toBeNull();
    expect(scopesAllowed(['hotel:search', 'orders:read'], OWNER.permissions)).toBe(true);
    expect(scopesAllowed(['webhooks:manage'], OWNER.permissions)).toBe(false);
    expect(scopesAllowed(['nope'], OWNER.permissions)).toBe(false);
    expect(normaliseAllowList([' 203.0.113.7 ', '203.0.113.0/24', '2001:db8::/32', '203.0.113.7'])).toEqual({
      list: ['203.0.113.7/32', '203.0.113.0/24', '2001:db8::/32'],
      bad: [],
      tooLong: false,
    });
    expect(normaliseAllowList(['10.0.0.0/33', 'example.com', '1.2.3.4/8/1']).bad).toHaveLength(3);
    expect(ipAllowed('203.0.113.99', ['203.0.113.0/24'])).toBe(true);
    expect(ipAllowed('::ffff:203.0.113.99', ['203.0.113.0/24'])).toBe(true);
    expect(ipAllowed('198.51.100.1', ['203.0.113.0/24'])).toBe(false);
    expect(ipAllowed('2001:db8:1::5', ['2001:db8::/32'])).toBe(true);
    expect(ipAllowed('anything', [])).toBe(true);
    expect(ipAllowed('not-an-ip', ['203.0.113.0/24'])).toBe(false);
  });
});

describe('keys', () => {
  it('create (shown once, hashed), resolve, 2 lasting keys max, revoke', async () => {
    const k = keys();
    const a = await k.create(OWNER, { name: 'Booking engine', scopes: ['hotel:search', 'hotel:book'], ipAllowList: ['203.0.113.0/24'] });
    expect(a.key).toMatch(/^mb_live_[A-Za-z0-9]{8}_[A-Za-z0-9]{40}$/);
    const stored = /** @type {any} */ (await ApiKeyRecord.findOne({ prefix: a.prefix }).setOptions(S).lean());
    expect(JSON.stringify(stored)).not.toContain(/** @type {string} */ (parseKey(a.key)?.secret));
    expect((await k.list(ORG))[0]).not.toHaveProperty('key');
    expect((await k.resolve(a.key))?.prefix).toBe(a.prefix);
    expect(await k.resolve(`${a.key.slice(0, -1)}${a.key.endsWith('A') ? 'B' : 'A'}`)).toBeNull(); // wrong secret
    expect(await k.resolve(a.key.replace('mb_live_', 'mb_test_'))).toBeNull(); // test key on live
    expect(await keys('test').resolve(a.key)).toBeNull(); // live key where test keys are expected
    expect(
      await createApiKeys({ clock, pepper: 'another-pepper-entirely', env: 'live', planAllowsApi: async () => true }).resolve(a.key),
    ).toBeNull();

    await k.create(OWNER, { name: 'Second', scopes: ['orders:read'] });
    await expect(k.create(OWNER, { name: 'Third', scopes: ['orders:read'] })).rejects.toMatchObject({ code: 'API_KEY_LIMIT' });
    expect((await k.revoke(ORG, 'user:u', a.id)).status).toBe('REVOKED');
    expect(await k.resolve(a.key)).toBeNull();
    expect((await k.create(OWNER, { name: 'Third', scopes: ['orders:read'] })).status).toBe('ACTIVE');
    await expect(k.revoke('65f0000000000000000a9999', 'user:x', a.id)).rejects.toMatchObject({ code: 'API_KEY_NOT_FOUND' });
  });

  it('scopes beyond the creator, no manage permission, plan without API, bad IPs → refused', async () => {
    const k = keys();
    await expect(k.create(OWNER, { name: 'x', scopes: ['webhooks:manage'] })).rejects.toMatchObject({ code: 'SCOPE_NOT_ALLOWED' });
    await expect(k.create(OWNER, { name: 'x', scopes: [] })).rejects.toMatchObject({ code: 'SCOPE_INVALID' });
    await expect(
      k.create({ ...OWNER, permissions: ['hotel-search.search.use'] }, { name: 'x', scopes: ['hotel:search'] }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(k.create(OWNER, { name: 'x', scopes: ['hotel:search'], ipAllowList: ['not-an-ip'] })).rejects.toMatchObject({
      code: 'IP_ENTRY_INVALID',
    });
    planAllows = false;
    await expect(k.create(OWNER, { name: 'x', scopes: ['hotel:search'] })).rejects.toMatchObject({ code: 'PLAN_HAS_NO_API' });
  });

  it('rotate: new key now, old key keeps working 24 h then stops; allow-list update; last use and new IPs', async () => {
    const k = keys();
    const a = await k.create(OWNER, { name: 'Engine', scopes: ['hotel:search'] });
    await k.create(OWNER, { name: 'Other', scopes: ['orders:read'] });
    const b = await k.rotate(OWNER, a.id); // allowed at 2 keys: the old one is now on its way out
    expect(b).toMatchObject({ name: 'Engine', scopes: ['hotel:search'] });
    await expect(k.rotate(OWNER, a.id)).rejects.toMatchObject({ code: 'API_KEY_NOT_ROTATABLE' });
    expect(await k.resolve(a.key)).not.toBeNull();
    nowMs += 24 * 60 * 60_000 + 1;
    expect(await k.resolve(a.key)).toBeNull();
    expect(await k.resolve(b.key)).not.toBeNull();

    expect((await k.update(ORG, b.id, { ipAllowList: ['198.51.100.7'] })).ipAllowList).toEqual(['198.51.100.7/32']);
    const doc = /** @type {any} */ (await k.resolve(b.key));
    expect(await k.touch(doc, '198.51.100.7')).toBe(true);
    const again = /** @type {any} */ (await k.resolve(b.key));
    expect(await k.touch(again, '198.51.100.7')).toBe(false);
    const after = /** @type {any} */ (await ApiKeyRecord.findOne({ prefix: b.prefix }).setOptions(S).lean());
    expect(after).toMatchObject({ lastUsedIp: '198.51.100.7', knownIps: ['198.51.100.7'] });
    expect(after.pendingEvents.map((/** @type {any} */ e) => e.type)).toEqual(['api-access.key.created', 'api-access.key.used-new-ip']);
  });
});
