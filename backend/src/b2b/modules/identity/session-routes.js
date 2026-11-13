// @ts-check
/**
 * POST /api/v1/auth/refresh | /logout | /logout-all — authenticated by the HttpOnly refresh cookie.
 * The cookie is SameSite=Strict and limited to /api/v1/auth; these routes also require the header
 * `X-B2B-Auth: 1`, which a cross-site form cannot send (extra CSRF protection).
 * Login routes that create sessions come in S01-T05/T06.
 */
import express from 'express';

import { UnauthorizedError } from '../../core/errors.js';
import { clearCookie, readCookie, setCookie } from '../../core/http/cookies.js';
import { publicRoute } from '../../core/http/permissions.js';

export const REFRESH_COOKIE = 'b2b_refresh';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** @type {import('express').RequestHandler} */
const requireAuthHeader = (req, _res, next) =>
  req.get('x-b2b-auth') === '1' ? next() : next(new UnauthorizedError('AUTH_HEADER_MISSING'));

/**
 * Sends new tokens: access token in the body, refresh token in the cookie.
 * @param {import('express').Response} res
 * @param {import('./sessions.service.js').IssuedTokens} tokens
 * @param {boolean} secure
 */
export function sendTokens(res, tokens, secure) {
  setCookie(res, REFRESH_COOKIE, tokens.refreshToken, { path: REFRESH_COOKIE_PATH, expires: tokens.refreshExpiresAt, secure });
  res.json({ accessToken: tokens.accessToken, expiresIn: tokens.expiresIn, tokenType: 'Bearer' });
}

/** @param {{ sessions: ReturnType<typeof import('./sessions.service.js').createSessionService>, secureCookies: boolean }} options */
export function sessionRoutes(options) {
  const router = express.Router();
  const clear = (/** @type {import('express').Response} */ res) =>
    clearCookie(res, REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH, secure: options.secureCookies });

  router.post('/refresh', publicRoute(), requireAuthHeader, (req, res, next) => {
    options.sessions.refresh(readCookie(req, REFRESH_COOKIE)).then(
      (tokens) => sendTokens(res, tokens, options.secureCookies),
      (/** @type {any} */ error) => {
        if (error?.status === 401) clear(res);
        next(error);
      },
    );
  });
  router.post('/logout', publicRoute(), requireAuthHeader, (req, res, next) => {
    options.sessions.logout(readCookie(req, REFRESH_COOKIE)).then(() => {
      clear(res);
      res.status(204).end();
    }, next);
  });
  router.post('/logout-all', publicRoute(), requireAuthHeader, (req, res, next) => {
    options.sessions.logoutAll(readCookie(req, REFRESH_COOKIE)).then((ended) => {
      clear(res);
      res.json({ sessionsEnded: ended });
    }, next);
  });
  return router;
}
