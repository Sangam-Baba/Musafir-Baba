// @ts-check
/**
 * Typed errors with stable codes, mapped to RFC 9457 problem details
 * (docs/plan/06-api-and-events.md §1, 10-coding-standards.md §4.5).
 * Clients switch on `code`, never on message text. Unknown errors never leak details.
 */

/** @typedef {Record<string, unknown>} ErrorDetails */

export class AppError extends Error {
  /**
   * @param {string} code    stable UPPER_SNAKE code, e.g. 'PRICE_CHANGED'
   * @param {number} status  HTTP status
   * @param {string} title   short human summary (safe to show)
   * @param {ErrorDetails} [details] safe, client-facing extra fields
   */
  constructor(code, status, title, details = {}) {
    super(`${code}: ${title}`);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.title = title;
    this.details = details;
  }
}

/** Input failed validation (zod issues go in `details.errors`). */
export class ValidationError extends AppError {
  /** @param {ErrorDetails} [details] */
  constructor(details = {}) {
    super('VALIDATION_FAILED', 400, 'The request is not valid', details);
  }
}

export class UnauthorizedError extends AppError {
  /** @param {string} [code] */
  constructor(code = 'UNAUTHENTICATED') {
    super(code, 401, 'Sign in required');
  }
}

export class ForbiddenError extends AppError {
  /** @param {string} [code] */
  constructor(code = 'FORBIDDEN') {
    super(code, 403, 'Not allowed');
  }
}

/** Also used for other organisations' records (never reveal they exist). */
export class NotFoundError extends AppError {
  /** @param {string} [code] */
  constructor(code = 'NOT_FOUND') {
    super(code, 404, 'Not found');
  }
}

export class ConflictError extends AppError {
  /** @param {string} code @param {ErrorDetails} [details] */
  constructor(code, details = {}) {
    super(code, 409, 'The request conflicts with the current state', details);
  }
}

/** A business rule refused the request (e.g. INVALID_MONEY, SOLD_OUT). */
export class DomainError extends AppError {
  /** @param {string} code @param {ErrorDetails} [details] */
  constructor(code, details = {}) {
    super(code, 422, 'The request breaks a business rule', details);
  }
}

export class RateLimitError extends AppError {
  /** @param {number} retryAfterSeconds */
  constructor(retryAfterSeconds) {
    super('RATE_LIMITED', 429, 'Too many requests', { retryAfterSeconds });
  }
}

export class ServiceUnavailableError extends AppError {
  /** @param {string} [code] */
  constructor(code = 'SERVICE_UNAVAILABLE') {
    super(code, 503, 'Temporarily unavailable');
  }
}

/**
 * @typedef {{ type: string, title: string, status: number, code: string, requestId?: string } & ErrorDetails} Problem
 */

/**
 * @param {unknown} error
 * @param {string} [requestId]
 * @returns {Problem}
 */
export function toProblem(error, requestId) {
  const known = error instanceof AppError ? error : null;
  const code = known?.code ?? 'INTERNAL_ERROR';
  return {
    ...(known?.details ?? {}),
    type: `https://musafirbaba.com/problems/${code.toLowerCase().replaceAll('_', '-')}`,
    title: known?.title ?? 'Something went wrong',
    status: known?.status ?? 500,
    code,
    ...(requestId ? { requestId } : {}),
  };
}
