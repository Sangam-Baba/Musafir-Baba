// @ts-check
/** Emails of the organizations module. */

/** @param {string} s */
const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * @param {{ to: string, orgName: string, link: string, days: number }} input
 * @returns {import('../../core/email.js').EmailMessage}
 */
export function invitationEmail(input) {
  const text = [
    `You have been invited to join ${input.orgName} on MusafirBaba Business.`,
    '',
    `Accept the invitation: ${input.link}`,
    '',
    `The link works once and expires in ${input.days} days. If you didn't expect this email, you can ignore it.`,
  ].join('\n');
  const html = `<p>You have been invited to join <b>${esc(input.orgName)}</b> on MusafirBaba Business.</p><p><a href="${esc(input.link)}">Accept the invitation</a></p><p>The link works once and expires in ${input.days} days. If you didn't expect this email, you can ignore it.</p>`;
  return { to: input.to, subject: `Invitation to join ${input.orgName} on MusafirBaba Business`, text, html };
}
