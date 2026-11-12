// @ts-check
/**
 * Rate limiting on MongoDB (no Redis — D22; no package — keeps the existing app's
 * dependencies unchanged). Fixed windows: one counter document per (limit, key, window)
 * in `core_rate_limits`, incremented with ONE upsert — correct across processes and
 * restarts; documents expire by TTL. Once a key is over its limit, the process remembers
 * it until the window ends, so blocked callers cause no further database writes.
 */
import { createCache } from './cache.js';
import { b2bMongoose } from './db/connection.js';
import { defineModel } from './db/model.js';
import { RateLimitError } from './errors.js';

export const RATE_LIMITS_COLLECTION = 'core_rate_limits';
const DUPLICATE_KEY = 11000;

const schema = new b2bMongoose.Schema(
  { _id: { type: String }, count: { type: Number, required: true }, expiresAt: { type: Date, required: true } },
  { versionKey: false },
);
const RateLimitCounter = defineModel('RateLimitCounter', schema, RATE_LIMITS_COLLECTION);

/** @typedef {{ allowed: boolean, limit: number, remaining: number, resetAt: Date, retryAfterSeconds: number }} RateLimitResult */

/**
 * @param {{ name: string, points: number, windowMs: number, clock: import('./clock.js').Clock }} options
 *   e.g. { name: 'login', points: 10, windowMs: 15 * 60_000 }
 */
export function createRateLimiter(options) {
  if (!/^[a-z][a-z0-9-]*$/.test(options.name)) throw new Error(`[b2b] rate limit name "${options.name}" must be kebab-case`);
  /** @type {ReturnType<typeof createCache<number>>} */
  const blocked = createCache({ max: 10_000, ttlMs: options.windowMs, clock: options.clock });

  /** @param {string} key @param {number} [cost] @returns {Promise<RateLimitResult>} */
  async function consume(key, cost = 1) {
    const now = options.clock.now().getTime();
    const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
    const resetAt = new Date(windowStart + options.windowMs);
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000));
    const id = `${options.name}:${key}:${windowStart}`;
    if (blocked.get(id) !== undefined) return { allowed: false, limit: options.points, remaining: 0, resetAt, retryAfterSeconds };

    const count = await increment(id, cost, resetAt);
    const allowed = count <= options.points;
    if (!allowed) blocked.set(id, count, resetAt.getTime() - now);
    return { allowed, limit: options.points, remaining: Math.max(0, options.points - count), resetAt, retryAfterSeconds };
  }

  /** @param {string} id @param {number} cost @param {Date} resetAt @returns {Promise<number>} */
  async function increment(id, cost, resetAt) {
    const update = { $inc: { count: cost }, $setOnInsert: { expiresAt: resetAt } };
    try {
      const doc = await RateLimitCounter.findOneAndUpdate({ _id: id }, update, { upsert: true, new: true }).lean();
      return Number(doc?.count ?? cost);
    } catch (error) {
      if (/** @type {{ code?: number }} */ (error).code !== DUPLICATE_KEY) throw error;
      const doc = await RateLimitCounter.findOneAndUpdate({ _id: id }, { $inc: { count: cost } }, { new: true }).lean();
      return Number(doc?.count ?? cost);
    }
  }

  return { consume, name: options.name };
}

/**
 * The client's IP. Production traffic reaches the backend only through the Cloudflare tunnel
 * (container bound to localhost), so `CF-Connecting-IP` is trusted. The existing app's
 * `trust proxy` setting is NOT changed.
 * @param {import('express').Request} req
 */
export function clientIp(req) {
  const cf = req.get('cf-connecting-ip');
  if (cf && /^[0-9a-fA-F:.]{3,45}$/.test(cf)) return cf;
  return req.socket.remoteAddress ?? 'unknown';
}

/**
 * Express middleware. Adds RateLimit-* headers; over the limit → 429 RATE_LIMITED with Retry-After.
 * @param {ReturnType<typeof createRateLimiter>} limiter
 * @param {(req: import('express').Request, res: import('express').Response) => string} keyOf
 * @returns {import('express').RequestHandler}
 */
export function rateLimit(limiter, keyOf) {
  return (req, res, next) => {
    limiter
      .consume(keyOf(req, res))
      .then((r) => {
        res.set({
          'RateLimit-Limit': String(r.limit),
          'RateLimit-Remaining': String(r.remaining),
          'RateLimit-Reset': String(r.retryAfterSeconds),
        });
        next(r.allowed ? undefined : new RateLimitError(r.retryAfterSeconds));
      })
      .catch(next);
  };
}
