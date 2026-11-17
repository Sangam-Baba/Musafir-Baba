// @ts-check
/**
 * /api/v1 error handling: every error becomes an RFC 9457 problem response with a
 * stable `code`. Internal details are logged, never sent.
 */
import { AppError, NotFoundError, RateLimitError, toProblem } from '../errors.js';

/** Body-parser errors carry `type`; map the common ones to stable codes. */
const BODY_PARSER_ERRORS = /** @type {Record<string, [number, string, string]>} */ ({
  'entity.parse.failed': [400, 'INVALID_JSON', 'The request body is not valid JSON'],
  'entity.too.large': [413, 'PAYLOAD_TOO_LARGE', 'The request body is too large'],
  'encoding.unsupported': [415, 'UNSUPPORTED_ENCODING', 'Unsupported content encoding'],
});

/**
 * @param {unknown} error
 * @returns {unknown}
 */
function normalise(error) {
  const type = /** @type {{ type?: unknown }} */ (error)?.type;
  const mapped = typeof type === 'string' ? BODY_PARSER_ERRORS[type] : undefined;
  return mapped ? new AppError(mapped[1], mapped[0], mapped[2]) : error;
}

/** Final 404 inside the B2B router — unknown /api/v1 paths never reach the existing app. */
export function notFoundHandler() {
  /** @type {import('express').RequestHandler} */
  const handler = (_req, _res, next) => next(new NotFoundError('ROUTE_NOT_FOUND'));
  return handler;
}

/** @param {import('../logger.js').Logger} logger */
export function problemHandler(logger) {
  /** @type {import('express').ErrorRequestHandler} */
  const handler = (rawError, req, res, _next) => {
    const error = normalise(rawError);
    const requestId = /** @type {string | undefined} */ (res.locals.requestId);
    const problem = toProblem(error, requestId);
    if (problem.status >= 500) {
      logger.error({ requestId, method: req.method, path: req.path, err: rawError }, 'b2b request failed');
    }
    if (res.headersSent) return;
    if (error instanceof RateLimitError) res.set('Retry-After', String(error.details.retryAfterSeconds));
    res.status(problem.status).type('application/problem+json').json(problem);
  };
  return handler;
}
