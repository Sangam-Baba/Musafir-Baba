// @ts-check
/**
 * Small, dependency-free protections for /api/v1 (no `helmet` package — keeps the
 * existing app's dependencies unchanged; HSTS is set at Cloudflare):
 * - security headers suitable for a JSON API
 * - a request timeout, so a slow B2B request can't hold resources in the shared process
 *   (docs/plan/12-… D5)
 * - the Idempotency-Key header reader
 */
import { randomUUID } from 'node:crypto';

import { AppError, ValidationError } from '../errors.js';

/** @returns {import('express').RequestHandler} */
export function securityHeaders() {
  return (_req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-site',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'Cache-Control': 'no-store',
    });
    next();
  };
}

/**
 * @param {number} ms
 * @returns {import('express').RequestHandler}
 */
export function requestTimeout(ms) {
  return (_req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) next(new AppError('REQUEST_TIMEOUT', 503, 'The request took too long'));
    }, ms);
    timer.unref();
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Reads `Idempotency-Key` (a UUID). Required on money/booking POSTs (06-api-and-events.md §1).
 * @param {import('express').Request} req
 * @returns {string}
 */
export function readIdempotencyKey(req) {
  const key = req.get('Idempotency-Key');
  if (!key || !UUID.test(key)) {
    throw new ValidationError({
      errors: [{ path: 'headers.idempotency-key', message: 'Idempotency-Key must be a UUID', code: 'invalid_idempotency_key' }],
    });
  }
  return key.toLowerCase();
}

/** For tests and clients: a valid key. */
export const newIdempotencyKey = () => randomUUID();
