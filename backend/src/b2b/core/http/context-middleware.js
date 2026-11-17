// @ts-check
/**
 * Builds the RequestContext for every /api/v1 request and puts it on `res.locals.ctx`.
 * Who the caller is comes from an `authenticate` function; Stage 01 supplies the real
 * ones (business-area login, existing website/admin tokens verified read-only, API keys).
 * Until then every caller is anonymous.
 */
import { createContext } from '../context.js';

/**
 * @typedef {(req: import('express').Request) => Promise<import('../context.js').Actor | null>} Authenticator
 */

/** @type {Authenticator} */
export const anonymousOnly = async () => null;

/**
 * @param {{ channel: import('../context.js').Channel, logger: import('../logger.js').Logger,
 *   authenticate?: Authenticator, clock?: import('../clock.js').Clock }} options
 * @returns {import('express').RequestHandler}
 */
export function contextMiddleware(options) {
  const authenticate = options.authenticate ?? anonymousOnly;
  return (req, res, next) => {
    authenticate(req)
      .then((actor) => {
        res.locals.ctx = createContext({
          requestId: /** @type {string} */ (res.locals.requestId),
          channel: options.channel,
          actor: actor ?? { type: 'anonymous' },
          logger: options.logger,
          ...(options.clock ? { clock: options.clock } : {}),
        });
        next();
      })
      .catch(next);
  };
}

/**
 * @param {import('express').Response} res
 * @returns {import('../context.js').RequestContext}
 */
export function contextOf(res) {
  const ctx = res.locals.ctx;
  if (!ctx) throw new Error('[b2b] RequestContext missing — contextMiddleware must run first');
  return ctx;
}
