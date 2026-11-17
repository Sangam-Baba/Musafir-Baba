// @ts-check
/**
 * Email for the B2B system (D25 option A: the existing Resend account; no new service).
 * - queueEmail(): stores the message SEALED in a `core.email.send` job (it may contain a one-time code),
 *   so nothing readable waits in `core_jobs`. The request never waits for Resend.
 * - The job handler unseals and sends through an EmailSender, with the queue's retries.
 * - Senders: `resend` (HTTPS call to the Resend API with the existing RESEND_API_KEY; plain fetch, no SDK)
 *   or `log` (development/test: writes the message to the log). Real sending happens ONLY when
 *   B2B_EMAIL_MODE=resend is set explicitly, so a developer machine never emails real people.
 * Not the existing app's email code — that stays untouched. Stage 02 moves sending behind `notify()`.
 */
import { seal, unseal } from './crypto.js';
import { enqueue } from './jobs/queue.js';

export const EMAIL_JOB = 'core.email.send';
const SEAL_PURPOSE = 'email-job';

/** @typedef {{ to: string, subject: string, text: string, html?: string }} EmailMessage */
/** @typedef {{ send: (message: EmailMessage) => Promise<{ id: string | null }> }} EmailSender */

/** @param {string} email */
const maskEmail = (email) => email.replace(/^(.{0,2}).*(@.*)$/, '$1***$2');

/**
 * @param {{ logger: import('./logger.js').Logger, showBody: boolean }} options showBody only outside production
 * @returns {EmailSender}
 */
export function createLogEmailSender(options) {
  return {
    async send(message) {
      options.logger.info(
        { to: maskEmail(message.to), subject: message.subject, ...(options.showBody ? { body: message.text } : {}) },
        'email (log mode — not sent)',
      );
      return { id: null };
    },
  };
}

/**
 * @param {{ apiKey: string, from: string, fetch?: typeof fetch }} options
 * @returns {EmailSender}
 */
export function createResendEmailSender(options) {
  const doFetch = options.fetch ?? fetch;
  return {
    async send(message) {
      const res = await doFetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${options.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: options.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`[b2b] Resend answered ${res.status}`); // the job queue retries with backoff
      const body = /** @type {{ id?: string }} */ (await res.json().catch(() => ({})));
      return { id: body.id ?? null };
    },
  };
}

/**
 * Picks the sender from configuration.
 * @param {{ B2B_EMAIL_MODE: 'log' | 'resend', RESEND_API_KEY?: string | undefined, B2B_EMAIL_FROM?: string | undefined, NODE_ENV: string }} config
 * @param {import('./logger.js').Logger} logger
 * @returns {EmailSender}
 */
export function emailSenderFromConfig(config, logger) {
  if (config.B2B_EMAIL_MODE !== 'resend') return createLogEmailSender({ logger, showBody: config.NODE_ENV !== 'production' });
  if (!config.RESEND_API_KEY || !config.B2B_EMAIL_FROM)
    throw new Error('[b2b] B2B_EMAIL_MODE=resend needs RESEND_API_KEY and B2B_EMAIL_FROM');
  return createResendEmailSender({ apiKey: config.RESEND_API_KEY, from: config.B2B_EMAIL_FROM });
}

/**
 * @param {EmailMessage} message
 * @param {{ secret: string, clock: import('./clock.js').Clock }} deps
 */
export function queueEmail(message, deps) {
  return enqueue({
    name: EMAIL_JOB,
    payload: { sealed: seal(message, { secret: deps.secret, purpose: SEAL_PURPOSE }) },
    maxAttempts: 6,
    clock: deps.clock,
  });
}

/**
 * @param {{ sender: EmailSender, secret: string }} deps
 * @returns {import('./jobs/runner.js').JobHandler}
 */
export function emailJobHandler(deps) {
  return async (payload) => {
    const message = /** @type {EmailMessage} */ (unseal(String(payload.sealed), { secret: deps.secret, purpose: SEAL_PURPOSE }));
    await deps.sender.send(message);
  };
}
