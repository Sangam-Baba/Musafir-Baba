// @ts-check
/**
 * Emails of the identity module. Plain text first; the HTML is a minimal copy. The code is never in
 * the subject line (lock screens show subjects).
 */

/** @param {string} s */
const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * @param {{ to: string, code: string, minutes: number, purpose: 'login' | 'reset' }} input
 * @returns {import('../../core/email.js').EmailMessage}
 */
export function codeEmail(input) {
  const what = input.purpose === 'login' ? 'sign in to MusafirBaba Business' : 'reset your MusafirBaba Business password';
  const subject = input.purpose === 'login' ? 'Your MusafirBaba Business sign-in code' : 'Reset your MusafirBaba Business password';
  const text = [
    `Use this code to ${what}:`,
    '',
    `    ${input.code}`,
    '',
    `It works once and expires in ${input.minutes} minutes.`,
    "If you didn't ask for it, you can ignore this email — your account stays safe. Never share this code; MusafirBaba will never ask for it.",
  ].join('\n');
  const html = `<p>Use this code to ${esc(what)}:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${esc(input.code)}</p><p>It works once and expires in ${input.minutes} minutes.</p><p>If you didn't ask for it, you can ignore this email. Never share this code; MusafirBaba will never ask for it.</p>`;
  return { to: input.to, subject, text, html };
}
