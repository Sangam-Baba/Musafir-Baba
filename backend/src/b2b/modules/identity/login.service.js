// @ts-check
/**
 * Password login for business users (plan Stage 01 §3.1, §8 "credential stuffing").
 * Order: rate limits (per IP, per account) → password check (lockout lives in the user record) →
 * on failure a growing delay per IP → on success a new session.
 * Error answers never say whether an account exists, except "locked" (after real failed attempts).
 */
import { createHash } from 'node:crypto';

import { AppError, ForbiddenError, RateLimitError, UnauthorizedError } from '../../core/errors.js';
import { parseLoginIdentifier } from './domain/user.js';

export const LOGIN_LIMITS = /** @type {const} */ ({ perIp: 20, perAccount: 10, windowMs: 15 * 60_000 });
const MAX_DELAY_MS = 3000;

/**
 * Delay before answering the n-th failed attempt from one IP in the window: none for the first 3,
 * then 250 ms, 500 ms, 1 s, 2 s, 3 s (cap).
 * @param {number} failures
 */
export const failureDelayMs = (failures) => (failures <= 3 ? 0 : Math.min(MAX_DELAY_MS, 250 * 2 ** (failures - 4)));

/** Rate-limit keys never contain the email/phone itself. @param {string} value */
const accountKey = (value) => createHash('sha256').update(value).digest('base64url').slice(0, 32);

/**
 * @param {{
 *   users: ReturnType<typeof import('./users.repository.js').createUserRepository>,
 *   sessions: ReturnType<typeof import('./sessions.service.js').createSessionService>,
 *   finish?: ReturnType<typeof import('./sign-in.js').createSignIn>['finish'],
 *   limiters: { ip: RateLimiter, account: RateLimiter, failures: RateLimiter },
 *   clock: import('../../core/clock.js').Clock,
 *   sleep?: (ms: number) => Promise<void>,
 * }} deps
 * @typedef {ReturnType<typeof import('../../core/rate-limit.js').createRateLimiter>} RateLimiter
 */
export function createLoginService(deps) {
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms).unref()));

  /** @param {string} ip */
  async function slowDown(ip) {
    const r = await deps.limiters.failures.consume(ip);
    await sleep(failureDelayMs(r.limit - r.remaining));
  }

  return {
    /**
     * @param {{ identifier: string, password: string, ip: string, userAgent?: string | null }} input
     * @returns {Promise<import('./sign-in.js').SignInResult>}
     */
    async login(input) {
      const { value } = parseLoginIdentifier(input.identifier);
      for (const [limiter, key] of /** @type {const} */ ([
        [deps.limiters.ip, input.ip],
        [deps.limiters.account, accountKey(value)],
      ])) {
        const r = await limiter.consume(key);
        if (!r.allowed) throw new RateLimitError(r.retryAfterSeconds);
      }
      const check = await deps.users.checkPassword(input.identifier, input.password);
      if (!check.ok) {
        if (check.reason === 'DISABLED') throw new ForbiddenError('ACCOUNT_DISABLED');
        await slowDown(input.ip);
        if (check.reason === 'LOCKED') {
          const retryAfterSeconds = Math.max(1, Math.ceil(((check.lockedUntil?.getTime() ?? 0) - deps.clock.now().getTime()) / 1000));
          throw new AppError('ACCOUNT_LOCKED', 423, 'Too many failed attempts — try again later', { retryAfterSeconds });
        }
        throw new UnauthorizedError('LOGIN_FAILED');
      }
      const client = { ip: input.ip, userAgent: input.userAgent ?? null };
      if (deps.finish) return deps.finish(check.user.id, ['password'], client);
      return deps.sessions.create({ userId: check.user.id, methods: ['password'], ...client });
    },
  };
}
