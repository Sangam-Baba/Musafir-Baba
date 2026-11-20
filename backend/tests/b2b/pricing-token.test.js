// @ts-check
/** Price tokens (S05-T06): tamper, expiry, rotation, binding to buyer / channel / stay, re-price, nothing hidden leaks. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  breakdownHash,
  buildBreakdown,
  createPriceTokenService,
  DEFAULT_SETTINGS,
  SEED_TAX_RULES,
  SigningKeyRecord,
  signToken,
  verifyToken,
} from '../../src/b2b/modules/pricing/index.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['price', 'token', 'test', 'secret', 'long-enough-for-hkdf'].join('-');
let nowMs = Date.parse('2026-11-18T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const minutes = (/** @type {number} */ m) => {
  nowMs += m * 60_000;
};

/** Test rule: +₹250 per night on the website and the B2B portal (₹700 → ₹950 + 5 % = ₹997.50). */
/** @type {import('../../src/b2b/modules/pricing/domain/margin.js').MarginRule} */
const website = {
  id: 'w',
  name: 'w',
  priority: 0,
  match: { channels: ['WEBSITE', 'B2B_PORTAL'] },
  adjustment: { type: 'FIXED_PER_NIGHT', value: 25000 },
  createdAt: new Date(0),
};
/** @param {number} net */
const breakdown = (net) =>
  buildBreakdown(
    { rules: [website], taxRules: SEED_TAX_RULES, settings: DEFAULT_SETTINGS, now: clock.now() },
    {
      ctx: { channel: 'B2B_PORTAL', hotelOrgId: 'h', propertyId: 'p1' },
      property: { stateCode: '07', gstRegistered: true },
      checkIn: '2026-12-01',
      checkOut: '2026-12-02',
      nightly: [{ date: '2026-12-01', amounts: [net] }],
    },
  );
/** @type {import('../../src/b2b/modules/pricing/domain/price-token.js').Buyer} */
const buyer = { channel: 'B2B_PORTAL', clientOrgId: 'c1' };
const stay = {
  propertyId: 'p1',
  roomTypeId: 'r1',
  ratePlanId: 'rp1',
  checkIn: '2026-12-01',
  checkOut: '2026-12-02',
  occupancies: [{ adults: 2, children: 0 }],
};

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  nowMs = Date.parse('2026-11-18T10:00:00Z');
  await SigningKeyRecord.deleteMany({});
});

describe('issue and check', () => {
  it('an untouched token for the same stay and price → SAME', async () => {
    const tokens = createPriceTokenService({ clock, secret: SECRET });
    const b = breakdown(70000);
    const { token, totalPaise, expiresAt } = await tokens.issue(buyer, stay, b);
    expect(totalPaise).toBe(99750);
    expect(expiresAt.toISOString()).toBe('2026-11-18T10:15:00.000Z');
    expect(await tokens.verifyAndReprice(token, { buyer, stay, fresh: breakdown(70000) })).toMatchObject({
      status: 'SAME',
      quotedTotalPaise: 99750,
    });
  });

  it('the hotel changed its rate meanwhile → CHANGED with the new breakdown (buyer sees it before paying)', async () => {
    const tokens = createPriceTokenService({ clock, secret: SECRET });
    const { token } = await tokens.issue(buyer, stay, breakdown(70000));
    const r = await tokens.verifyAndReprice(token, { buyer, stay, fresh: breakdown(80000) });
    expect(r.status).toBe('CHANGED');
    expect(r.quotedTotalPaise).toBe(99750);
    expect(r.breakdown.totals.totalPaise).toBe(110250);
  });

  it('the token shows nothing hidden: no hotel rate, no margin, no rule', async () => {
    const { token } = await createPriceTokenService({ clock, secret: SECRET }).issue(buyer, stay, breakdown(70000));
    const text = Buffer.from(token.split('.')[0] ?? '', 'base64url').toString('utf8');
    for (const hidden of ['70000', '25000', 'net', 'margin', 'rule']) expect(text).not.toContain(hidden);
    expect(JSON.parse(text)).toMatchObject({ totalPaise: 99750, channel: 'B2B_PORTAL', clientOrgId: 'c1', propertyId: 'p1' });
  });

  it('the breakdown fingerprint is keyed: without the server secret it cannot be checked against guesses', () => {
    const b = breakdown(70000);
    expect(breakdownHash(b, { secret: SECRET, kid: 'k1' })).not.toBe(breakdownHash(b, { secret: `${SECRET}-other`, kid: 'k1' }));
    expect(breakdownHash(b, { secret: SECRET, kid: 'k1' })).not.toBe(breakdownHash(b, { secret: SECRET, kid: 'k2' }));
    expect(breakdownHash({ a: 1, b: 2 }, { secret: SECRET, kid: 'k' })).toBe(breakdownHash({ b: 2, a: 1 }, { secret: SECRET, kid: 'k' }));
  });
});

describe('refused', () => {
  /**
   * @param {string} token
   * @param {Partial<import('../../src/b2b/modules/pricing/domain/price-token.js').Buyer>} [as]
   */
  const check = (token, as = buyer) =>
    verifyToken(token, { secret: SECRET, usableKids: new Set(['k1']), now: clock.now(), buyer: { ...buyer, ...as } });
  const sign = () =>
    signToken({ ...buyer, ...stay, totalPaise: 89250, breakdown: { x: 1 } }, { secret: SECRET, kid: 'k1', now: clock.now() }).token;

  it('tampered amount, payload or signature → PRICE_TOKEN_INVALID', () => {
    const token = sign();
    const [body, mac] = token.split('.');
    const payload = JSON.parse(Buffer.from(body ?? '', 'base64url').toString('utf8'));
    const cheaper = Buffer.from(JSON.stringify({ ...payload, totalPaise: 100 })).toString('base64url');
    expect(() => check(`${cheaper}.${mac}`)).toThrow(/PRICE_TOKEN_INVALID/);
    const flipped = `${body}.${(mac ?? '').slice(0, -2)}${(mac ?? '').endsWith('AA') ? 'BB' : 'AA'}`;
    expect(() => check(flipped)).toThrow(/PRICE_TOKEN_INVALID/);
    for (const junk of ['', 'abc', 'a.b.c', `${body}.`, '!!!.???', 'x'.repeat(5000)])
      expect(() => check(junk)).toThrow(/PRICE_TOKEN_INVALID/);
    expect(() => verifyToken(token, { secret: `${SECRET}-other`, usableKids: new Set(['k1']), now: clock.now(), buyer })).toThrow(
      /PRICE_TOKEN_INVALID/,
    );
  });

  it('after 15 minutes → PRICE_TOKEN_EXPIRED', () => {
    const token = sign();
    minutes(14);
    expect(() => check(token)).not.toThrow();
    minutes(1);
    expect(() => check(token)).toThrow(/PRICE_TOKEN_EXPIRED/);
  });

  it("another client's, another channel's or a website customer's use → PRICE_TOKEN_NOT_YOURS", () => {
    const token = sign();
    expect(() => check(token, { clientOrgId: 'c2' })).toThrow(/PRICE_TOKEN_NOT_YOURS/);
    expect(() => check(token, { channel: 'B2B_API' })).toThrow(/PRICE_TOKEN_NOT_YOURS/);
    expect(() => check(token, { channel: 'WEBSITE', clientOrgId: null })).toThrow(/PRICE_TOKEN_NOT_YOURS/);
  });

  it('a different stay, room, plan or guests → PRICE_TOKEN_STAY_MISMATCH', async () => {
    const tokens = createPriceTokenService({ clock, secret: SECRET });
    const { token } = await tokens.issue(buyer, stay, breakdown(70000));
    for (const other of [
      { checkOut: '2026-12-03' },
      { roomTypeId: 'r2' },
      { ratePlanId: 'rp2' },
      { occupancies: [{ adults: 3, children: 0 }] },
    ])
      await expect(tokens.verifyAndReprice(token, { buyer, stay: { ...stay, ...other }, fresh: breakdown(70000) })).rejects.toThrow(
        /PRICE_TOKEN_STAY_MISMATCH/,
      );
  });

  it('a key that is not ours → PRICE_TOKEN_INVALID', () => {
    const forged = signToken(
      { ...buyer, ...stay, totalPaise: 1, breakdown: {} },
      { secret: SECRET, kid: 'k-unknown', now: clock.now() },
    ).token;
    expect(() => check(forged)).toThrow(/PRICE_TOKEN_INVALID/);
  });
});

describe('key rotation', () => {
  it('after a rotation old tokens still verify until they expire; new tokens use the new key', async () => {
    const a = createPriceTokenService({ clock, secret: SECRET });
    const b = createPriceTokenService({ clock, secret: SECRET }); // another backend process
    const old = await a.issue(buyer, stay, breakdown(70000));
    const oldKid = JSON.parse(Buffer.from(old.token.split('.')[0] ?? '', 'base64url').toString('utf8')).kid;
    const newKid = await a.rotate();
    expect(newKid).not.toBe(oldKid);
    const fresh = await a.issue(buyer, stay, breakdown(70000));
    expect(fresh.token).not.toBe(old.token);
    // the other process learns the new key on first sight of a token naming it
    expect((await b.verifyAndReprice(fresh.token, { buyer, stay, fresh: breakdown(70000) })).status).toBe('SAME');
    expect((await b.verifyAndReprice(old.token, { buyer, stay, fresh: breakdown(70000) })).status).toBe('SAME');
    minutes(16);
    await expect(a.verifyAndReprice(old.token, { buyer, stay, fresh: breakdown(70000) })).rejects.toThrow(/PRICE_TOKEN_EXPIRED/);
  });

  it('an old key stops verifying after its grace period, even for a crafted long-lived token', async () => {
    const a = createPriceTokenService({ clock, secret: SECRET });
    await a.issue(buyer, stay, breakdown(70000));
    const oldKid = String((await SigningKeyRecord.findOne({ status: 'ACTIVE' }).lean())?._id);
    await a.rotate();
    minutes(21); // past VERIFY_GRACE_MINUTES
    const crafted = signToken(
      { ...buyer, ...stay, totalPaise: 89250, breakdown: {} },
      { secret: SECRET, kid: oldKid, now: clock.now() },
    ).token;
    await expect(
      createPriceTokenService({ clock, secret: SECRET }).verifyAndReprice(crafted, { buyer, stay, fresh: breakdown(70000) }),
    ).rejects.toThrow(/PRICE_TOKEN_INVALID/);
  });

  it('several processes starting at once make exactly one signing key', async () => {
    await Promise.all(
      Array.from({ length: 6 }, () => createPriceTokenService({ clock, secret: SECRET }).issue(buyer, stay, breakdown(70000))),
    );
    expect(await SigningKeyRecord.countDocuments({ status: 'ACTIVE' })).toBe(1);
  });

  it('a short server secret is refused at start', () => {
    expect(() => createPriceTokenService({ clock, secret: 'short' })).toThrow(/B2B_AUTH_SECRET/);
  });
});
