// @ts-check
/**
 * Message templates (plan Stage 02 §3.8, §7 "all messages via templates; no hand-written emails in code").
 * Versioned, each with the variables it may use. Rendering refuses unknown or missing variables, strips
 * control characters (a company name can't add lines or headers to an email) and limits length. Emails are
 * plain text, and the bell shows text only, so markup in a company name is shown as typed, never run. Pure.
 */
import { DomainError } from '../../../core/errors.js';

/** @typedef {{ version: number, vars: readonly string[], title: string, body: string, subject: string, text: string }} Template */

/** @type {Readonly<Record<string, Template>>} */
export const TEMPLATES = Object.freeze({
  'kyc.submitted': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Verification submitted',
    body: 'We received the verification details for {{orgName}}. We will review them and let you know.',
    subject: 'We received your verification — MusafirBaba Business',
    text: 'Hello,\n\nWe received the verification details for {{orgName}}. Our team will review them and let you know.\n\nSee the status: {{link}}\n\nMusafirBaba Business',
  },
  'kyc.approved': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Verification approved',
    body: '{{orgName}} is verified. You can now start listing your property.',
    subject: 'Your business is verified — MusafirBaba Business',
    text: 'Hello,\n\nGood news: {{orgName}} is verified and active on MusafirBaba Business.\n\nOpen your workspace: {{link}}\n\nMusafirBaba Business',
  },
  'kyc.rejected': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Verification needs changes',
    body: 'Some details for {{orgName}} need changes. Open your application to see what to fix.',
    subject: 'Your verification needs changes — MusafirBaba Business',
    text: 'Hello,\n\nWe could not verify {{orgName}} yet. Please open your application to see what needs to change, then submit it again.\n\n{{link}}\n\nMusafirBaba Business',
  },
  'team.role-changed': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Your role changed',
    body: 'Your role in {{orgName}} was changed.',
    subject: 'Your role changed — MusafirBaba Business',
    text: 'Hello,\n\nYour role in {{orgName}} was changed. What you can see and do there may be different now.\n\n{{link}}\n\nMusafirBaba Business',
  },
});

const PLACEHOLDER = /\{\{([a-zA-Z]+)\}\}/g;
const MAX_VALUE = 200;

/** @param {string} ch */
const isControl = (ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127;

/** Control characters (new lines, tabs…) become spaces; length is limited. @param {unknown} value */
const clean = (value) =>
  Array.from(String(value ?? ''), (ch) => (isControl(ch) ? ' ' : ch))
    .join('')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, MAX_VALUE);

/**
 * @param {string} text
 * @param {Template} template
 * @param {Record<string, string>} values
 */
function fill(text, template, values) {
  return text.replace(PLACEHOLDER, (_m, name) => {
    if (!template.vars.includes(name)) throw new DomainError('TEMPLATE_VARIABLE_UNKNOWN', { name });
    return values[name] ?? '';
  });
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} vars
 * @param {Readonly<Record<string, Template>>} [templates]
 * @returns {{ title: string, body: string, subject: string, text: string, version: number }}
 */
export function renderTemplate(key, vars, templates = TEMPLATES) {
  const template = templates[key];
  if (!template) throw new DomainError('TEMPLATE_NOT_FOUND', { key });
  const missing = template.vars.filter((v) => vars[v] === undefined || vars[v] === null);
  if (missing.length > 0) throw new DomainError('TEMPLATE_VARIABLES_MISSING', { missing });
  /** @type {Record<string, string>} */
  const values = Object.fromEntries(template.vars.map((v) => [v, clean(vars[v])]));
  return {
    title: fill(template.title, template, values),
    body: fill(template.body, template, values),
    subject: fill(template.subject, template, values),
    text: fill(template.text, template, values),
    version: template.version,
  };
}
