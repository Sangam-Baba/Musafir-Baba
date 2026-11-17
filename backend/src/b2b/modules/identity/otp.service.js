// @ts-check
/**
 * One-time codes by email (plan Stage 01 §3.1, §8 "OTP abuse"). No SMS in v1 (D26).
 * request(): always answers the same way (no account probing); limits per email (1 per minute,
 *   10 per day — keyed by a hash of the email) and per IP (20 per hour). A new code cancels the old one.
 * verify(): ≤ 5 guesses per code (counted atomically before comparing), 10 minutes, single use.
 */
import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { queueEmail } from '../../core/email.js';
import { AppError, RateLimitError, ServiceUnavailableError, UnauthorizedError } from '../../core/errors.js';
import { normaliseEmail } from './domain/user.js';
import { codeEmail } from './emails.js';
import { OtpRecord } from './models/otp.model.js';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_LIMITS = /** @type {const} */ ({
  cooldownMs: 60_000,
  perDay: 10,
  perIpPerHour: 20,
  verifyPerIp: 30,
  verifyWindowMs: 15 * 60_000,
});

/** @typedef {import('./models/otp.model.js').OTP_PURPOSES[number]} OtpPurpose */
/** @typedef {ReturnType<typeof import('../../core/rate-limit.js').createRateLimiter>} RateLimiter */

/** @param {string} value */
const emailKey = (value) => createHash('sha256').update(value).digest('base64url').slice(0, 32);

/** @param {RateLimiter} limiter @param {string} key */
async function take(limiter, key) {
  const r = await limiter.consume(key);
  if (!r.allowed) throw new RateLimitError(r.retryAfterSeconds);
}

/**
 * @param {{
 *   users: ReturnType<typeof import('./users.repository.js').createUserRepository>,
 *   secret: string | undefined,
 *   clock: import('../../core/clock.js').Clock,
 *   limiters: { cooldown: RateLimiter, daily: RateLimiter, ip: RateLimiter, verifyIp: RateLimiter },
 *   sendEmail?: (message: import('../../core/email.js').EmailMessage) => Promise<unknown>,
 * }} deps
 */
export function createOtpService(deps) {
  const secret = () => {
    if (!deps.secret || deps.secret.length < 32) throw new ServiceUnavailableError('BUSINESS_LOGIN_NOT_CONFIGURED');
    return deps.secret;
  };
  const send = deps.sendEmail ?? ((m) => queueEmail(m, { secret: secret(), clock: deps.clock }));
  /** @param {string} userId @param {OtpPurpose} purpose @param {string} code */
  const hash = (userId, purpose, code) => createHmac('sha256', secret()).update(`otp:${purpose}:${userId}:${code}`).digest('base64url');

  return {
    /**
     * Sends a code if the email belongs to an active business user. Same answer either way.
     * @param {{ purpose: OtpPurpose, email: string, ip: string }} input
     */
    async request(input) {
      secret();
      const email = normaliseEmail(input.email);
      await take(deps.limiters.cooldown, `${input.purpose}:${emailKey(email)}`);
      await take(deps.limiters.daily, emailKey(email));
      await take(deps.limiters.ip, input.ip);
      const user = await deps.users.findForCode(email);
      if (!user || user.status !== 'ACTIVE') return;
      const now = deps.clock.now();
      await OtpRecord.updateMany({ userId: user.id, purpose: input.purpose, consumedAt: null }, { $set: { consumedAt: now } });
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await OtpRecord.create({
        userId: user.id,
        purpose: input.purpose,
        codeHash: hash(user.id, input.purpose, code),
        expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60_000),
      });
      await send(codeEmail({ to: email, code, minutes: OTP_TTL_MINUTES, purpose: input.purpose }));
    },

    /**
     * @param {{ purpose: OtpPurpose, email: string, code: string, ip: string }} input
     * @returns {Promise<{ id: string, email: string }>} the user whose code it was
     */
    async verify(input) {
      secret();
      await take(deps.limiters.verifyIp, input.ip);
      const email = normaliseEmail(input.email);
      const user = await deps.users.findForCode(email);
      const now = deps.clock.now();
      if (!user || user.status !== 'ACTIVE' || !/^\d{6}$/.test(input.code)) throw new UnauthorizedError('CODE_INVALID');
      if (input.purpose === 'login' && user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
        throw new AppError('ACCOUNT_LOCKED', 423, 'Too many failed attempts — try again later', {
          retryAfterSeconds: Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000),
        });
      }
      const doc = await OtpRecord.findOneAndUpdate(
        { userId: user.id, purpose: input.purpose, consumedAt: null, expiresAt: { $gt: now }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
        { $inc: { attempts: 1 } },
        { sort: { createdAt: -1 }, new: true },
      ).lean();
      if (!doc) throw new UnauthorizedError('CODE_INVALID');
      const expected = Buffer.from(doc.codeHash);
      const given = Buffer.from(hash(user.id, input.purpose, input.code));
      if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new UnauthorizedError('CODE_INVALID');
      const used = await OtpRecord.updateOne({ _id: doc._id, userId: user.id, consumedAt: null }, { $set: { consumedAt: now } });
      if (used.modifiedCount !== 1) throw new UnauthorizedError('CODE_INVALID'); // used by a parallel request
      await deps.users.markEmailVerified(user.id);
      return { id: user.id, email };
    },
  };
}
