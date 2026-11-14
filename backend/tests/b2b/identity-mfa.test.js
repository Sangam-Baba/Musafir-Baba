// @ts-check
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { base32Decode, base32Encode, hotp, matchTotp, otpauthUrl, stepAt } from '../../src/b2b/modules/identity/domain/totp.js';
import {
  createMfaService,
  createSessionService,
  createUserRepository,
  SessionRecord,
  UserRecord,
} from '../../src/b2b/modules/identity/index.js';
import { MfaRecord } from '../../src/b2b/modules/identity/models/mfa.model.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'mfa', 'test', 'secret', 'long-enough-for-hmac-1234'].join('-');
const PASSWORD = 'correct-horse-battery';
let now = new Date('2026-11-14T10:00:00Z');
const clock = { now: () => now };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));
/** The app's code right now. @param {string} secret */
const appCode = (secret) => hotp(secret, stepAt(now));

describe('TOTP (RFC 6238 test vectors, 6 digits)', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('t=%i → %s', (t, code) => {
    expect(hotp(RFC_SECRET, Math.floor(t / 30))).toBe(code);
  });

  it('base32 round-trips; codes match ±1 step only; QR link has the standard fields', () => {
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode(RFC_SECRET).toString()).toBe('12345678901234567890');
    const at = new Date(1111111109 * 1000);
    expect(matchTotp(RFC_SECRET, '081804', at)).toBe(Math.floor(1111111109 / 30));
    expect(matchTotp(RFC_SECRET, '081804', new Date(at.getTime() + 30_000))).not.toBeNull(); // one step late: ok
    expect(matchTotp(RFC_SECRET, '081804', new Date(at.getTime() + 90_000))).toBeNull(); // three steps: no
    expect(matchTotp(RFC_SECRET, '12345', at)).toBeNull();
    expect(otpauthUrl({ secret: 'ABC', account: 'asha@example.com' })).toBe(
      'otpauth://totp/MusafirBaba%20Business%3Aasha%40example.com?secret=ABC&issuer=MusafirBaba%20Business&algorithm=SHA1&digits=6&period=30',
    );
  });
});

describe('two-step login', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  const users = createUserRepository({ bcryptCost: 4, clock });
  const mfa = createMfaService({ secret: SECRET, clock });
  const sessions = createSessionService({ secret: SECRET, clock });
  let userId = '';

  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  });
  afterAll(async () => mongo.stop());
  beforeEach(async () => {
    now = new Date('2026-11-14T10:00:00Z');
    await Promise.all([
      UserRecord.deleteMany({}),
      MfaRecord.deleteMany({}).setOptions(SYSTEM),
      SessionRecord.deleteMany({}).setOptions(SYSTEM),
      mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
    ]);
    userId = (await users.create({ email: 'asha@example.com', name: 'Asha', password: PASSWORD })).id;
  });

  /** Turns two-step login on, returns the secret and recovery codes. */
  async function turnOn() {
    const { secret } = await mfa.setup(userId, 'asha@example.com');
    const { recoveryCodes } = await mfa.enable(userId, appCode(secret));
    now = new Date(now.getTime() + 30_000); // next code
    return { secret, recoveryCodes };
  }

  describe('service', () => {
    it('setup → enable with a right code → 10 recovery codes; the secret is stored sealed', async () => {
      expect(await mfa.status(userId)).toEqual({ totp: 'off', recoveryCodesLeft: 0 });
      const { secret, otpauthUrl: url } = await mfa.setup(userId, 'asha@example.com');
      expect(url).toContain(`secret=${secret}`);
      expect(await mfa.status(userId)).toMatchObject({ totp: 'pending' });
      await expect(mfa.enable(userId, appCode(secret) === '000000' ? '111111' : '000000')).rejects.toMatchObject({
        code: 'MFA_CODE_INVALID',
      });
      const { recoveryCodes } = await mfa.enable(userId, appCode(secret));
      expect(recoveryCodes).toHaveLength(10);
      expect(recoveryCodes[0]).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/);
      expect(await mfa.status(userId)).toEqual({ totp: 'on', recoveryCodesLeft: 10 });
      const raw = JSON.stringify(await MfaRecord.findOne({ userId }).lean());
      expect(raw).not.toContain(secret);
      expect(raw).not.toContain(/** @type {string} */ (recoveryCodes[0]));
    });

    it('a code works once (no replay); the next one works; a recovery code works once', async () => {
      const { secret, recoveryCodes } = await turnOn();
      const code = appCode(secret);
      await expect(mfa.verify(userId, { code })).resolves.toBe('totp');
      await expect(mfa.verify(userId, { code })).rejects.toMatchObject({ code: 'MFA_CODE_INVALID' });
      now = new Date(now.getTime() + 30_000);
      await expect(mfa.verify(userId, { code: appCode(secret) })).resolves.toBe('totp');
      const rc = /** @type {string} */ (recoveryCodes[3]);
      await expect(mfa.verify(userId, { recoveryCode: rc.toUpperCase().replace('-', ' ') })).resolves.toBe('recovery-code');
      await expect(mfa.verify(userId, { recoveryCode: rc })).rejects.toMatchObject({ code: 'MFA_CODE_INVALID' });
      expect((await mfa.status(userId)).recoveryCodesLeft).toBe(9);
    });

    it('parallel use of one code: exactly one succeeds', async () => {
      const { secret } = await turnOn();
      const code = appCode(secret);
      const results = await Promise.allSettled(Array.from({ length: 5 }, () => mfa.verify(userId, { code })));
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    });

    it("can't restart setup while on; disable and new recovery codes need a valid code", async () => {
      const { secret, recoveryCodes } = await turnOn();
      await expect(mfa.setup(userId, 'x')).rejects.toMatchObject({ code: 'MFA_ALREADY_ON' });
      const fresh = await mfa.regenerateRecoveryCodes(userId, { code: appCode(secret) });
      expect(fresh.recoveryCodes).not.toEqual(recoveryCodes);
      await expect(mfa.verify(userId, { recoveryCode: /** @type {string} */ (recoveryCodes[0]) })).rejects.toMatchObject({
        code: 'MFA_CODE_INVALID',
      }); // old set gone
      await expect(mfa.disable(userId, { recoveryCode: 'nope-nopes' })).rejects.toMatchObject({ code: 'MFA_CODE_INVALID' });
      await mfa.disable(userId, { recoveryCode: /** @type {string} */ (fresh.recoveryCodes[0]) });
      expect(await mfa.isEnabled(userId)).toBe(false);
    });
  });

  describe('HTTP (real router)', () => {
    /** @type {Awaited<ReturnType<typeof startServer>>} */
    let srv;
    beforeAll(async () => {
      const app = express();
      app.use(
        '/api/v1',
        createB2BRouter({ connect: false, logger: createLogger({ write: () => {} }), clock, env: { B2B_AUTH_SECRET: SECRET } }),
      );
      srv = await startServer(app);
    });
    afterAll(async () => srv.close());
    const H = { 'x-b2b-auth': '1' };
    /** @param {string} token */
    const bearer = (token) => ({ authorization: `Bearer ${token}` });
    const passwordLogin = () => srv.post('/api/v1/auth/login', { identifier: 'asha@example.com', password: PASSWORD }, H);

    it('turn on from /me, then login needs the app code; the session records both methods', async () => {
      const first = await passwordLogin();
      const access = first.body.accessToken;
      expect((await srv.post('/api/v1/me/mfa/totp/setup', {})).status).toBe(401); // not signed in
      const setup = await srv.post('/api/v1/me/mfa/totp/setup', {}, bearer(access));
      expect(setup.status).toBe(200);
      const enabled = await srv.post('/api/v1/me/mfa/totp/enable', { code: appCode(setup.body.secret) }, bearer(access));
      expect(enabled.body.recoveryCodes).toHaveLength(10);

      now = new Date(now.getTime() + 30_000);
      const second = await passwordLogin();
      expect(second.body).toMatchObject({ mfaRequired: true, expiresIn: 300 });
      expect(second.headers.get('set-cookie')).toBeNull(); // no session yet
      // the challenge is not an access token
      expect((await srv.get('/api/v1/me/mfa', bearer(second.body.mfaToken))).status).toBe(401);
      expect((await srv.post('/api/v1/auth/mfa/verify', { mfaToken: second.body.mfaToken, code: '000000' }, H)).status).toBe(401);
      const done = await srv.post('/api/v1/auth/mfa/verify', { mfaToken: second.body.mfaToken, code: appCode(setup.body.secret) }, H);
      expect(done.status).toBe(200);
      expect(done.headers.get('set-cookie')).toMatch(/^b2b_refresh=/);
      const latest = await SessionRecord.findOne({ userId }).sort({ createdAt: -1 }).lean();
      expect(latest?.methods).toEqual(['password', 'totp']);

      now = new Date(now.getTime() + 6 * 60_000); // challenge expired
      expect(
        (await srv.post('/api/v1/auth/mfa/verify', { mfaToken: second.body.mfaToken, code: appCode(setup.body.secret) }, H)).body.code,
      ).toBe('MFA_CHALLENGE_INVALID');
    });

    it('step-up: password when two-step login is off; app code (not password) when on', async () => {
      const { accessToken } = (await passwordLogin()).body;
      expect((await srv.post('/api/v1/me/step-up', { password: 'wrong-password' }, bearer(accessToken))).status).toBe(401);
      const ok = await srv.post('/api/v1/me/step-up', { password: PASSWORD }, bearer(accessToken));
      expect(ok.body.stepUpUntil).toBe(new Date(now.getTime() + 10 * 60_000).toISOString());

      const { secret } = await turnOn();
      expect((await srv.post('/api/v1/me/step-up', { password: PASSWORD }, bearer(accessToken))).body.code).toBe('MFA_CODE_REQUIRED');
      expect((await srv.post('/api/v1/me/step-up', { code: appCode(secret) }, bearer(accessToken))).status).toBe(200);
      expect((await srv.post('/api/v1/me/step-up', { code: appCode(secret), password: PASSWORD }, bearer(accessToken))).status).toBe(400);
    });

    it('a logged-out session or a forged token opens nothing', async () => {
      const login = await passwordLogin();
      const access = login.body.accessToken;
      expect((await srv.get('/api/v1/me/mfa', bearer(access))).status).toBe(200);
      const tokens = await sessions.create({ userId, methods: ['password'] });
      await sessions.revokeAll(userId, 'LOGOUT_ALL');
      expect((await srv.get('/api/v1/me/mfa', bearer(access))).status).toBe(401);
      expect((await srv.get('/api/v1/me/mfa', bearer(tokens.accessToken))).status).toBe(401);
      expect((await srv.get('/api/v1/me/mfa', bearer(`${access}x`))).status).toBe(401);
    });

    it('email-code sign-in also asks for the app code when two-step login is on', async () => {
      await turnOn();
      const { createSignIn } = await import('../../src/b2b/modules/identity/index.js');
      const result = await createSignIn({ sessions, mfa, secret: SECRET, clock }).finish(userId, ['email-otp'], {});
      expect(result).toMatchObject({ mfaRequired: true });
    });
  });
});
