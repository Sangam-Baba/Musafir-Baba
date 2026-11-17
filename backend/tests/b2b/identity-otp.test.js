// @ts-check
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seal, unseal } from '../../src/b2b/core/crypto.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import {
  createLogEmailSender,
  createResendEmailSender,
  EMAIL_JOB,
  emailJobHandler,
  emailSenderFromConfig,
  queueEmail,
} from '../../src/b2b/core/email.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createRateLimiter, RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import {
  createOtpService,
  createSessionService,
  createUserRepository,
  SessionRecord,
  UserRecord,
} from '../../src/b2b/modules/identity/index.js';
import { OtpRecord } from '../../src/b2b/modules/identity/models/otp.model.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'otp', 'test', 'secret', 'long-enough-for-hmac-123'].join('-');
const PASSWORD = 'correct-horse-battery';
let now = new Date('2026-11-13T10:00:00Z');
const clock = { now: () => now };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };

/** @returns {{ lines: any[], logger: ReturnType<typeof createLogger> }} */
function captureLogger() {
  /** @type {any[]} */
  const lines = [];
  return { lines, logger: createLogger({ write: (l) => lines.push(JSON.parse(l)) }) };
}

describe('sealing (AES-256-GCM)', () => {
  it('round-trips, and refuses tampering, another secret or another purpose', () => {
    const s = seal({ code: '123456' }, { secret: SECRET, purpose: 'email-job' });
    expect(s).not.toContain('123456');
    expect(unseal(s, { secret: SECRET, purpose: 'email-job' })).toEqual({ code: '123456' });
    expect(() => unseal(s, { secret: SECRET, purpose: 'other' })).toThrow();
    expect(() => unseal(s, { secret: 'x'.repeat(40), purpose: 'email-job' })).toThrow();
    const flipped = Buffer.from(s, 'base64url');
    flipped.writeUInt8(flipped.readUInt8(flipped.length - 1) ^ 1, flipped.length - 1);
    expect(() => unseal(flipped.toString('base64url'), { secret: SECRET, purpose: 'email-job' })).toThrow();
  });
});

describe('email senders', () => {
  const msg = { to: 'asha@example.com', subject: 'Hi', text: 'code 123456' };

  it('log mode masks the address and shows the body only outside production', async () => {
    const dev = captureLogger();
    await createLogEmailSender({ logger: dev.logger, showBody: true }).send(msg);
    expect(dev.lines[0]).toMatchObject({ to: 'as***@example.com', subject: 'Hi', body: 'code 123456' });
    const prod = captureLogger();
    await createLogEmailSender({ logger: prod.logger, showBody: false }).send(msg);
    expect(JSON.stringify(prod.lines)).not.toContain('123456');
  });

  it('resend mode posts to the Resend API; failures throw so the job retries', async () => {
    /** @type {any[]} */
    const calls = [];
    const fakeFetch = /** @type {typeof fetch} */ (
      /** @type {unknown} */ (
        async (/** @type {string} */ url, /** @type {any} */ init) => {
          calls.push({ url, init });
          return new Response(JSON.stringify({ id: 'em_1' }), { status: 200 });
        }
      )
    );
    const sender = createResendEmailSender({ apiKey: 're_test', from: 'MB <b@musafirbaba.com>', fetch: fakeFetch });
    expect(await sender.send(msg)).toEqual({ id: 'em_1' });
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(calls[0].init.headers.authorization).toBe('Bearer re_test');
    expect(JSON.parse(calls[0].init.body)).toMatchObject({ from: 'MB <b@musafirbaba.com>', to: ['asha@example.com'], subject: 'Hi' });
    const failing = createResendEmailSender({
      apiKey: 'k',
      from: 'f',
      fetch: /** @type {any} */ (async () => new Response('no', { status: 500 })),
    });
    await expect(failing.send(msg)).rejects.toThrow(/500/);
  });

  it('real sending only when B2B_EMAIL_MODE=resend is set explicitly (and configured)', () => {
    const { logger } = captureLogger();
    expect(
      emailSenderFromConfig({ B2B_EMAIL_MODE: 'log', RESEND_API_KEY: 're_x', B2B_EMAIL_FROM: 'a@b.c', NODE_ENV: 'production' }, logger),
    ).toHaveProperty('send');
    expect(() => emailSenderFromConfig({ B2B_EMAIL_MODE: 'resend', NODE_ENV: 'production' }, logger)).toThrow(/RESEND_API_KEY/);
  });
});

describe('one-time codes', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  const users = createUserRepository({ bcryptCost: 4, clock });
  /** @type {import('../../src/b2b/core/email.js').EmailMessage[]} */
  let outbox = [];

  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  });
  afterAll(async () => mongo.stop());
  beforeEach(async () => {
    now = new Date('2026-11-13T10:00:00Z');
    outbox = [];
    await Promise.all([
      UserRecord.deleteMany({}),
      OtpRecord.deleteMany({}).setOptions(SYSTEM),
      SessionRecord.deleteMany({}).setOptions(SYSTEM),
      JobRecord.deleteMany({}),
      mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
    ]);
    await users.create({ email: 'asha@example.com', name: 'Asha', password: PASSWORD });
  });

  /** @param {Partial<Record<'cooldown' | 'daily' | 'ip' | 'verifyIp', number>>} [points] */
  const makeOtp = (points = {}) => {
    const tag = Math.random().toString(36).slice(2, 8);
    /** @param {string} n @param {number} p @param {number} w */
    const lim = (n, p, w) => createRateLimiter({ name: `t-${n}-${tag}`, points: p, windowMs: w, clock });
    return createOtpService({
      users,
      secret: SECRET,
      clock,
      limiters: {
        cooldown: lim('cool', points.cooldown ?? 1, 60_000),
        daily: lim('day', points.daily ?? 10, 86_400_000),
        ip: lim('ip', points.ip ?? 20, 3_600_000),
        verifyIp: lim('vip', points.verifyIp ?? 30, 900_000),
      },
      sendEmail: async (m) => {
        outbox.push(m);
      },
    });
  };
  const codeFrom = (/** @type {import('../../src/b2b/core/email.js').EmailMessage} */ m) =>
    /** @type {string} */ (/\b(\d{6})\b/.exec(m.text)?.[1]);

  it('sends a 6-digit code to an existing user; unknown emails get the same answer and no email', async () => {
    const otp = makeOtp();
    await otp.request({ purpose: 'login', email: 'ASHA@example.com', ip: '1.1.1.1' });
    await otp.request({ purpose: 'login', email: 'ghost@example.com', ip: '1.1.1.1' });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.to).toBe('asha@example.com');
    expect(outbox[0]?.subject).not.toMatch(/\d{6}/); // never in the subject
    const stored = await OtpRecord.find({}).setOptions(SYSTEM).lean();
    expect(JSON.stringify(stored)).not.toContain(codeFrom(/** @type {any} */ (outbox[0])));
  });

  it('a right code works once and marks the email verified', async () => {
    const otp = makeOtp();
    await otp.request({ purpose: 'login', email: 'asha@example.com', ip: '1.1.1.1' });
    const code = codeFrom(/** @type {any} */ (outbox[0]));
    await expect(otp.verify({ purpose: 'login', email: 'asha@example.com', code, ip: '1.1.1.1' })).resolves.toMatchObject({
      email: 'asha@example.com',
    });
    await expect(otp.verify({ purpose: 'login', email: 'asha@example.com', code, ip: '1.1.1.1' })).rejects.toMatchObject({
      code: 'CODE_INVALID',
    });
    expect((await users.findByLogin('asha@example.com'))?.emailVerified).toBe(true);
  });

  it('5 wrong guesses kill the code; it expires after 10 minutes; codes are per purpose', async () => {
    const otp = makeOtp();
    await otp.request({ purpose: 'login', email: 'asha@example.com', ip: '1.1.1.1' });
    const code = codeFrom(/** @type {any} */ (outbox[0]));
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1)
      await expect(otp.verify({ purpose: 'login', email: 'asha@example.com', code: wrong, ip: '1.1.1.1' })).rejects.toMatchObject({
        code: 'CODE_INVALID',
      });
    await expect(otp.verify({ purpose: 'login', email: 'asha@example.com', code, ip: '1.1.1.1' })).rejects.toMatchObject({
      code: 'CODE_INVALID',
    });

    now = new Date('2026-11-13T10:02:00Z');
    await otp.request({ purpose: 'login', email: 'asha@example.com', ip: '1.1.1.1' });
    const fresh = codeFrom(/** @type {any} */ (outbox[1]));
    await expect(otp.verify({ purpose: 'reset', email: 'asha@example.com', code: fresh, ip: '1.1.1.1' })).rejects.toMatchObject({
      code: 'CODE_INVALID',
    });
    now = new Date('2026-11-13T10:12:01Z');
    await expect(otp.verify({ purpose: 'login', email: 'asha@example.com', code: fresh, ip: '1.1.1.1' })).rejects.toMatchObject({
      code: 'CODE_INVALID',
    });
  });

  it('parallel guesses are counted exactly — no more than 5 comparisons per code', async () => {
    const otp = makeOtp({ verifyIp: 100 });
    await otp.request({ purpose: 'login', email: 'asha@example.com', ip: '1.1.1.1' });
    await Promise.allSettled(
      Array.from({ length: 12 }, (_, i) =>
        otp.verify({ purpose: 'login', email: 'asha@example.com', code: String(100000 + i), ip: '1.1.1.1' }),
      ),
    );
    expect((await OtpRecord.findOne({ userId: (await users.findByLogin('asha@example.com'))?.id }).lean())?.attempts).toBe(5);
  });

  it('a new code replaces the old one; cool-down 1 per minute (also for unknown emails); daily cap', async () => {
    const otp = makeOtp({ daily: 2 });
    await otp.request({ purpose: 'login', email: 'asha@example.com', ip: '1.1.1.1' });
    await expect(otp.request({ purpose: 'login', email: 'asha@example.com', ip: '1.1.1.1' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    await otp.request({ purpose: 'login', email: 'ghost@example.com', ip: '1.1.1.1' });
    await expect(otp.request({ purpose: 'login', email: 'ghost@example.com', ip: '1.1.1.1' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    now = new Date('2026-11-13T10:01:00Z');
    await otp.request({ purpose: 'login', email: 'asha@example.com', ip: '1.1.1.1' });
    await expect(
      otp.verify({ purpose: 'login', email: 'asha@example.com', code: codeFrom(/** @type {any} */ (outbox[0])), ip: '1.1.1.1' }),
    ).rejects.toMatchObject({
      code: 'CODE_INVALID',
    });
    now = new Date('2026-11-13T10:02:00Z');
    await expect(otp.request({ purpose: 'login', email: 'asha@example.com', ip: '1.1.1.1' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    }); // 3rd today
  });

  it('a locked account cannot sign in with a code (but can still reset its password)', async () => {
    await UserRecord.updateOne(
      { email: 'asha@example.com' },
      { $set: { 'failedLogins.count': 5, 'failedLogins.lockedUntil': new Date('2026-11-13T10:15:00Z') } },
    );
    const otp = makeOtp();
    await otp.request({ purpose: 'login', email: 'asha@example.com', ip: '1.1.1.1' });
    await expect(
      otp.verify({ purpose: 'login', email: 'asha@example.com', code: codeFrom(/** @type {any} */ (outbox[0])), ip: '1.1.1.1' }),
    ).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
    });
    await otp.request({ purpose: 'reset', email: 'asha@example.com', ip: '1.1.1.1' });
    await expect(
      otp.verify({ purpose: 'reset', email: 'asha@example.com', code: codeFrom(/** @type {any} */ (outbox[1])), ip: '1.1.1.1' }),
    ).resolves.toBeTruthy();
  });

  describe('HTTP + email job (real router, real queue)', () => {
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

    /** Runs the queued email job like the background runner would, returns the code. */
    async function deliverLatestEmail() {
      const job = await JobRecord.findOne({ name: EMAIL_JOB }).sort({ _id: -1 }).lean();
      expect(job).toBeTruthy();
      expect(JSON.stringify(job?.payload)).not.toMatch(/asha|\b\d{6}\b/); // nothing readable waits in core_jobs
      /** @type {import('../../src/b2b/core/email.js').EmailMessage[]} */
      const sent = [];
      await emailJobHandler({ sender: { send: async (m) => (sent.push(m), { id: null }) }, secret: SECRET })(
        /** @type {any} */ (job?.payload),
        /** @type {any} */ (job),
      );
      return codeFrom(/** @type {any} */ (sent[0]));
    }

    it('sign in with an emailed code', async () => {
      expect((await srv.post('/api/v1/auth/otp/request', { email: 'asha@example.com' }, H)).status).toBe(202);
      const code = await deliverLatestEmail();
      const res = await srv.post('/api/v1/auth/otp/verify', { email: 'asha@example.com', code }, H);
      expect(res.status).toBe(200);
      expect(res.headers.get('set-cookie')).toMatch(/^b2b_refresh=/);
      expect((await SessionRecord.findOne({}).setOptions(SYSTEM).lean())?.methods).toEqual(['email-otp']);
    });

    it('forgot → reset: new password works, old one does not, every session ended', async () => {
      const sessions = createSessionService({ secret: SECRET, clock });
      const id = /** @type {string} */ ((await users.findByLogin('asha@example.com'))?.id);
      const old = await sessions.create({ userId: id, methods: ['password'] });
      expect((await srv.post('/api/v1/auth/password/forgot', { email: 'asha@example.com' }, H)).status).toBe(202);
      const code = await deliverLatestEmail();
      expect((await srv.post('/api/v1/auth/password/reset', { email: 'asha@example.com', code, newPassword: 'short' }, H)).status).toBe(
        422,
      );
      // refused BEFORE the code is used, so the same code still works for a good password
      const reset = await srv.post(
        '/api/v1/auth/password/reset',
        { email: 'asha@example.com', code, newPassword: 'a-brand-new-passphrase' },
        H,
      );
      expect(reset.status).toBe(204);
      expect(await sessions.findActive(old.sessionId, id)).toBeNull();
      expect((await srv.post('/api/v1/auth/login', { identifier: 'asha@example.com', password: 'a-brand-new-passphrase' }, H)).status).toBe(
        200,
      );
      expect((await srv.post('/api/v1/auth/login', { identifier: 'asha@example.com', password: PASSWORD }, H)).status).toBe(401);
    });

    it('bodies are strict; unknown emails still get 202', async () => {
      expect((await srv.post('/api/v1/auth/otp/request', { email: { $ne: null } }, H)).status).toBe(400);
      expect((await srv.post('/api/v1/auth/otp/verify', { email: 'asha@example.com', code: '12ab56' }, H)).status).toBe(400);
      expect((await srv.post('/api/v1/auth/otp/request', { email: 'nobody@example.com' }, H)).status).toBe(202);
    });
  });

  it('queueEmail seals the whole message', async () => {
    await queueEmail({ to: 'asha@example.com', subject: 'S', text: 'code 654321' }, { secret: SECRET, clock });
    const job = await JobRecord.findOne({ name: EMAIL_JOB }).lean();
    expect(Object.keys(job?.payload ?? {})).toEqual(['sealed']);
    expect(JSON.stringify(job)).not.toMatch(/654321|asha/);
  });
});
