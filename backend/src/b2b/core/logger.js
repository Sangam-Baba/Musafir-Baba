// @ts-check
/**
 * Structured JSON-lines logger for B2B code. No dependency (keeps the existing app's
 * packages unchanged). Secrets and personal data are redacted by key name, at any depth.
 * Usage: logger.info({ orderId, durationMs }, 'booking confirmed') — never whole objects with PII.
 */
import { systemClock } from './clock.js';

/** @typedef {'debug' | 'info' | 'warn' | 'error'} LogLevel */
/** @typedef {Record<string, unknown>} LogFields */
/**
 * @typedef {object} Logger
 * @property {(fields: LogFields, msg: string) => void} debug
 * @property {(fields: LogFields, msg: string) => void} info
 * @property {(fields: LogFields, msg: string) => void} warn
 * @property {(fields: LogFields, msg: string) => void} error
 * @property {(bindings: LogFields) => Logger} child
 */

const LEVELS = /** @type {const} */ (['debug', 'info', 'warn', 'error']);
const SENSITIVE_KEY =
  /pass(word)?|token|secret|otp|authori[sz]ation|cookie|api[-_]?key|salt|hash|pan(number)?$|aadhaar|account(number|no)?$|ifsc|cvv|card|email|phone|mobile|guest(s)?$/i;
const REDACTED = '[REDACTED]';
const MAX_DEPTH = 5;

/**
 * @param {{ level?: LogLevel, bindings?: LogFields, write?: (line: string) => void, clock?: import('./clock.js').Clock }} [options]
 * @returns {Logger}
 */
export function createLogger(options = {}) {
  const minimum = LEVELS.indexOf(options.level ?? 'info');
  const write = options.write ?? ((line) => process.stdout.write(line + '\n'));
  const clock = options.clock ?? systemClock;
  const bindings = options.bindings ?? {};

  /** @param {LogLevel} level */
  const at = (level) => (/** @type {LogFields} */ fields, /** @type {string} */ msg) => {
    if (LEVELS.indexOf(level) < minimum) return;
    const entry = { time: clock.now().toISOString(), level, msg, ...redact({ ...bindings, ...fields }, 0) };
    write(JSON.stringify(entry));
  };

  return {
    debug: at('debug'),
    info: at('info'),
    warn: at('warn'),
    error: at('error'),
    child: (more) => createLogger({ ...options, bindings: { ...bindings, ...more } }),
  };
}

/**
 * @param {unknown} value
 * @param {number} depth
 * @returns {any}
 */
export function redact(value, depth) {
  if (value instanceof Error) return serializeError(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Date) return value.toISOString();
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, v] of Object.entries(value)) out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(v, depth + 1);
  return out;
}

/** @param {Error} error */
function serializeError(error) {
  const code = /** @type {{ code?: unknown }} */ (error).code;
  return {
    name: error.name,
    message: error.message,
    ...(code !== undefined ? { code } : {}),
    ...(process.env.NODE_ENV === 'production' ? {} : { stack: error.stack }),
  };
}

/** Shared logger for B2B processes; level from B2B_LOG_LEVEL (default info). */
export const logger = createLogger({
  level: /** @type {LogLevel} */ (LEVELS.find((l) => l === process.env.B2B_LOG_LEVEL) ?? 'info'),
  bindings: { service: 'b2b' },
});
