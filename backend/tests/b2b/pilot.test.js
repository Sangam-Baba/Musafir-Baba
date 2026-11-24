// @ts-check
/**
 * Gradual launch (S16-T05): `B2B_PILOT_ORGS` unset → everyone (nothing changes); set → only the listed client
 * companies pass the gates of the switched-on features; staff, hotels and visitors are not affected; a key of a
 * company outside the list → API_NOT_ENABLED; billing starts trials only for pilot companies.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { SubscriptionRecord, seedPlans } from '../../src/b2b/modules/subscriptions/index.js';
import { createApiKeyAuthenticator } from '../../src/b2b/routes/api-keys-wiring.js';
import { inPilot, pilotGate, pilotOrgs } from '../../src/b2b/routes/pilot.js';
import { startMissingSubscriptions } from '../../src/b2b/routes/subscriptions-wiring.js';
import { createSubscriptions } from '../../src/b2b/modules/subscriptions/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-24T06:30:00Z') };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const A = '65f0000000000000000c1601';
const B = '65f0000000000000000c1602';
const LIST = { B2B_PILOT_ORGS: ` ${A} , not-an-id ` };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());

/** Run the gate for an actor; the error it passes on, or null. @param {NodeJS.ProcessEnv} env @param {any} actor */
function gate(env, actor) {
  /** @type {any} */
  let passed;
  pilotGate(env, 'WALLET_NOT_ENABLED')(
    /** @type {any} */ ({}),
    /** @type {any} */ ({ locals: { ctx: { actor } } }),
    (/** @type {any} */ e) => (passed = e ?? null),
  );
  return passed;
}

describe('pilot list', () => {
  it('no list → everyone; a list → only the listed client companies; others untouched', () => {
    expect(pilotOrgs({})).toBeNull();
    expect([...(pilotOrgs(LIST) ?? [])]).toEqual([A]);
    expect(inPilot({}, B)).toBe(true);
    expect(inPilot(LIST, A)).toBe(true);
    expect(inPilot(LIST, B)).toBe(false);
    const member = (/** @type {string} */ orgId, orgType = 'CLIENT') => ({ type: 'member', orgId, orgType, userId: 'u', permissions: [] });
    expect(gate({}, member(B))).toBeNull();
    expect(gate(LIST, member(A))).toBeNull();
    expect(gate(LIST, member(B))).toMatchObject({ code: 'WALLET_NOT_ENABLED', status: 503 });
    expect(gate(LIST, member(B, 'HOTEL'))).toBeNull();
    expect(gate(LIST, { type: 'staff', staffId: 's', permissions: [] })).toBeNull();
    expect(gate(LIST, { type: 'anonymous' })).toBeNull();
  });

  it('a key of a company outside the list is refused; billing starts trials only for pilot companies', async () => {
    const env = { B2B_API_ENABLED: 'true', ...LIST };
    const keys = /** @type {any} */ ({
      resolve: async () => ({ _id: 'k1', orgId: B, createdByUserId: 'u', scopes: [], ipAllowList: [], status: 'ACTIVE' }),
      touch: async () => false,
    });
    const authenticate = createApiKeyAuthenticator({ env, clock, keys, resolveMember: async () => null });
    const req = /** @type {any} */ ({
      get: (/** @type {string} */ n) => (n === 'authorization' ? `Bearer mb_live_ABCDEFGH_${'y'.repeat(40)}` : undefined),
      ip: '127.0.0.1',
      socket: {},
    });
    await expect(authenticate(req)).rejects.toMatchObject({ code: 'API_NOT_ENABLED' });

    await seedPlans();
    for (const [id, ref] of [
      [A, 'MBC-PILOTA'],
      [B, 'MBC-PILOTB'],
    ])
      await OrganizationRecord.create({ _id: id, type: 'CLIENT', reference: ref, legalName: ref, displayName: ref, status: 'ACTIVE' });
    expect(await startMissingSubscriptions(createSubscriptions({ clock }), LIST)).toBe(1);
    expect((await SubscriptionRecord.find({}).setOptions(S).lean()).map((s) => s.clientOrgId)).toEqual([A]);
    expect(await startMissingSubscriptions(createSubscriptions({ clock }), {})).toBe(1); // list removed → the rest start
  });
});
