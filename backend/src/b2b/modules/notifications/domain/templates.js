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
  'kyc.approved-client': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Verification approved',
    body: '{{orgName}} is verified. You can now search hotels with your B2B prices and add your team.',
    subject: 'Your company is verified — MusafirBaba Business',
    text: 'Hello,\n\nGood news: {{orgName}} is verified and active on MusafirBaba Business. You can now search hotels with your B2B prices, set your own markup and invite your team.\n\nOpen your workspace: {{link}}\n\nMusafirBaba Business',
  },
  'kyc.rejected': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Verification needs changes',
    body: 'Some details for {{orgName}} need changes. Open your application to see what to fix.',
    subject: 'Your verification needs changes — MusafirBaba Business',
    text: 'Hello,\n\nWe could not verify {{orgName}} yet. Please open your application to see what needs to change, then submit it again.\n\n{{link}}\n\nMusafirBaba Business',
  },
  'kyc.reminder': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Finish your verification',
    body: 'The registration of {{orgName}} is not finished yet. Add the missing details and documents, then submit.',
    subject: 'Finish registering your business — MusafirBaba Business',
    text: 'Hello,\n\nYou started registering {{orgName}} on MusafirBaba Business but have not submitted it yet. Add the missing details and documents, then submit:\n\n{{link}}\n\nIf it stays unfinished, we will remove the registration and its documents.\n\nMusafirBaba Business',
  },
  'booking-request.confirmed': {
    version: 1,
    vars: ['orgName', 'link', 'propertyName'],
    title: 'Booking request confirmed',
    body: 'Your booking request at {{propertyName}} is confirmed by MusafirBaba.',
    subject: 'Booking request confirmed — MusafirBaba Business',
    text: 'Hello,\n\nMusafirBaba has confirmed the booking request from {{orgName}} at {{propertyName}}.\n\nSee the details and the hotel confirmation number: {{link}}\n\nMusafirBaba Business',
  },
  'booking-request.declined': {
    version: 1,
    vars: ['orgName', 'link', 'propertyName', 'reason'],
    title: 'Booking request declined',
    body: 'Your booking request at {{propertyName}} could not be arranged: {{reason}}',
    subject: 'Booking request declined — MusafirBaba Business',
    text: 'Hello,\n\nMusafirBaba could not arrange the booking request from {{orgName}} at {{propertyName}}.\n\nReason: {{reason}}\n\nSee it here: {{link}}\n\nMusafirBaba Business',
  },
  // Stage 08: website customers (email only — they have no bell). Sent to the email given at checkout.
  'order.confirmed-customer': {
    version: 1,
    vars: ['name', 'orderRef', 'propertyName', 'checkIn', 'checkOut', 'total', 'link'],
    title: 'Booking confirmed',
    body: 'Your booking {{orderRef}} at {{propertyName}} is confirmed.',
    subject: 'Booking confirmed — {{propertyName}} ({{orderRef}})',
    text: 'Hello {{name}},\n\nYour booking at {{propertyName}} is confirmed and paid.\n\nBooking: {{orderRef}}\nCheck-in: {{checkIn}}\nCheck-out: {{checkOut}}\nTotal paid: {{total}} (incl. GST)\n\nYour voucher, GST invoice and receipt: {{link}}\n\nPlease carry a government photo ID for every guest.\n\nMusafirBaba · +91 92896 02447 · care@musafirbaba.com',
  },
  'order.refunding-customer': {
    version: 1,
    vars: ['name', 'orderRef', 'total', 'link'],
    title: 'Rooms sold out — refund on the way',
    body: 'The rooms for {{orderRef}} sold out before your payment reached us. Your {{total}} is being refunded.',
    subject: 'Your payment of {{total}} is being refunded ({{orderRef}})',
    text: 'Hello {{name}},\n\nWe are sorry: the rooms for your booking {{orderRef}} sold out before your payment reached us, so the booking could not be confirmed.\n\nYour payment of {{total}} is being refunded to the same card, UPI or bank account through PayU. Banks usually take a few working days to show it.\n\nSee the status: {{link}}\n\nMusafirBaba · +91 92896 02447 · care@musafirbaba.com',
  },
  'amendment.reply-customer': {
    version: 1,
    vars: ['name', 'orderRef', 'requestRef', 'link'],
    title: 'Reply to your request',
    body: 'MusafirBaba replied to your request {{requestRef}}.',
    subject: 'Reply to your request {{requestRef}} (booking {{orderRef}})',
    text: 'Hello {{name}},\n\nMusafirBaba replied to your request {{requestRef}} about booking {{orderRef}}.\n\nRead it and answer here: {{link}}\n\n(Please reply on that page — replies to this email are not read yet.)\n\nMusafirBaba · +91 92896 02447 · care@musafirbaba.com',
  },
  'no-show.marked-customer': {
    version: 1,
    vars: ['name', 'orderRef', 'link'],
    title: 'The hotel reported a no-show',
    body: 'The hotel reported that nobody checked in for {{orderRef}}.',
    subject: 'The hotel reported a no-show for {{orderRef}}',
    text: 'Hello {{name}},\n\nThe hotel told us that nobody checked in for your booking {{orderRef}}. The no-show terms of your booking apply.\n\nIf you did stay, or this is wrong, tell us within 72 hours here: {{link}}\n\nMusafirBaba · +91 92896 02447 · care@musafirbaba.com',
  },
  'hotel-failed-customer': {
    version: 1,
    vars: ['name', 'orderRef', 'link'],
    title: "The hotel can't host your stay",
    body: "The hotel can't host booking {{orderRef}}. We're arranging an alternative or a full refund.",
    subject: "Important: the hotel can't host your booking {{orderRef}}",
    text: "Hello {{name}},\n\nWe're sorry: the hotel told us it can't host your booking {{orderRef}}. Our team is arranging a similar hotel for you, or a full refund — we'll contact you shortly.\n\nYour booking: {{link}}\n\nMusafirBaba · +91 92896 02447 · care@musafirbaba.com",
  },
  // Stage 09: cancellations
  'order.cancelled-customer': {
    version: 1,
    vars: ['name', 'orderRef', 'propertyName', 'refund', 'link'],
    title: 'Booking cancelled',
    body: 'Your booking {{orderRef}} at {{propertyName}} is cancelled. Refund: {{refund}}.',
    subject: 'Booking cancelled — {{propertyName}} ({{orderRef}})',
    text: 'Hello {{name}},\n\nYour booking {{orderRef}} at {{propertyName}} is cancelled.\n\nRefund: {{refund}} — sent back to the same card, UPI or bank account through PayU. Banks usually take a few working days to show it.\n\nSee the details: {{link}}\n\nMusafirBaba · +91 92896 02447 · care@musafirbaba.com',
  },
  'booking.cancelled': {
    version: 1,
    vars: ['orgName', 'link', 'propertyName'],
    title: 'Booking cancelled',
    body: 'A booking at {{propertyName}} was cancelled by the guest. The rooms are back on sale.',
    subject: 'Booking cancelled at {{propertyName}}',
    text: 'Hello,\n\nA booking at {{propertyName}} was cancelled by the guest. The rooms are back in your calendar.\n\nSee it here: {{link}}\n\nMusafirBaba Business',
  },
  // Stage 08: bookings — the hotel's alert, reminders and the escalation to its owners
  'booking.new': {
    version: 1,
    vars: ['orgName', 'link', 'propertyName'],
    title: 'New booking',
    body: 'New confirmed booking at {{propertyName}}. Open it and acknowledge.',
    subject: 'New booking at {{propertyName}} — please acknowledge',
    text: 'Hello,\n\nA new booking at {{propertyName}} is confirmed and paid. Please open it, check the guests, dates and room, and acknowledge it:\n\n{{link}}\n\nMusafirBaba Business',
  },
  'booking.reminder': {
    version: 1,
    vars: ['orgName', 'link', 'propertyName'],
    title: 'Booking waiting for you',
    body: 'A booking at {{propertyName}} is not acknowledged yet. Please open it and acknowledge.',
    subject: 'Reminder: a booking at {{propertyName}} needs your acknowledgement',
    text: 'Hello,\n\nA confirmed booking at {{propertyName}} has not been acknowledged yet. Please open it and acknowledge it:\n\n{{link}}\n\nMusafirBaba Business',
  },
  'booking.escalated': {
    version: 1,
    vars: ['orgName', 'link', 'propertyName'],
    title: 'Booking not acknowledged for 30 minutes',
    body: 'A booking at {{propertyName}} has waited 30 minutes. Please make sure someone acknowledges it.',
    subject: 'Action needed: a booking at {{propertyName}} is not acknowledged',
    text: 'Hello,\n\nA confirmed booking at {{propertyName}} ({{orgName}}) has waited 30 minutes without being acknowledged. Please make sure your team opens it now:\n\n{{link}}\n\nIf it is not acknowledged within the hour, MusafirBaba will call the hotel.\n\nMusafirBaba Business',
  },
  'listing.published': {
    version: 1,
    vars: ['orgName', 'link', 'propertyName'],
    title: 'Listing is live',
    body: '{{propertyName}} is now live on MusafirBaba.',
    subject: 'Your listing is live — MusafirBaba Business',
    text: 'Hello,\n\n{{propertyName}} ({{orgName}}) has been approved and is now live on MusafirBaba.\n\nSee it here: {{link}}\n\nMusafirBaba Business',
  },
  'listing.changes-requested': {
    version: 1,
    vars: ['orgName', 'link', 'propertyName'],
    title: 'Listing needs changes',
    body: 'Some parts of {{propertyName}} need changes. Open the listing to see the comments.',
    subject: 'Your listing needs changes — MusafirBaba Business',
    text: 'Hello,\n\nWe reviewed {{propertyName}} ({{orgName}}) and some parts need changes before it can go live. Open the listing to see our comments, make the changes and submit it again:\n\n{{link}}\n\nMusafirBaba Business',
  },
  'listing.suspended': {
    version: 1,
    vars: ['orgName', 'link', 'propertyName', 'reason'],
    title: 'Listing suspended',
    body: '{{propertyName}} was taken off sale: {{reason}}',
    subject: 'Your listing was suspended — MusafirBaba Business',
    text: 'Hello,\n\n{{propertyName}} ({{orgName}}) has been taken off sale for now. Reason: {{reason}}\n\nExisting bookings are not affected. Please contact MusafirBaba if you have questions.\n\n{{link}}\n\nMusafirBaba Business',
  },
  'listing.revision-decided': {
    version: 1,
    vars: ['orgName', 'link', 'propertyName', 'decision'],
    title: 'Listing changes reviewed',
    body: 'Your changes to {{propertyName}} were {{decision}}.',
    subject: 'Your listing changes were reviewed — MusafirBaba Business',
    text: 'Hello,\n\nYour changes to {{propertyName}} ({{orgName}}) were {{decision}}.\n\n{{link}}\n\nMusafirBaba Business',
  },
  'team.role-changed': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Your role changed',
    body: 'Your role in {{orgName}} was changed.',
    subject: 'Your role changed — MusafirBaba Business',
    text: 'Hello,\n\nYour role in {{orgName}} was changed. What you can see and do there may be different now.\n\n{{link}}\n\nMusafirBaba Business',
  },
  // Stage 12B: offline booking for a B2B client
  'order.booked-offline': {
    version: 1,
    vars: ['orgName', 'link'],
    title: 'Booking made for you by MusafirBaba',
    body: 'MusafirBaba booked a stay for {{orgName}} as you asked. See it in My Bookings.',
    subject: 'MusafirBaba made a booking for {{orgName}}',
    text: 'Hello,\n\nMusafirBaba booked a stay for {{orgName}} as you asked, paid from your wallet.\n\nSee it here: {{link}}\n\nMusafirBaba Business',
  },
  // Stage 11: client wallets
  'wallet.topup-credited': {
    version: 1,
    vars: ['orgName', 'link', 'amount'],
    title: 'Money added to your wallet',
    body: '{{amount}} was added to the {{orgName}} wallet.',
    subject: '{{amount}} added to your MusafirBaba wallet',
    text: 'Hello,\n\n{{amount}} was added to the {{orgName}} wallet.\n\nSee your wallet: {{link}}\n\nMusafirBaba Business',
  },
  'wallet.low-balance': {
    version: 1,
    vars: ['orgName', 'link', 'amount'],
    title: 'Wallet balance is low',
    body: 'The {{orgName}} wallet has less than {{amount}} available. Add money so bookings are not stopped.',
    subject: 'Your MusafirBaba wallet is below {{amount}}',
    text: 'Hello,\n\nThe {{orgName}} wallet has less than {{amount}} available. Add money so bookings are not stopped.\n\nAdd money: {{link}}\n\nMusafirBaba Business',
  },
  'wallet.credit-overdue': {
    version: 1,
    vars: ['orgName', 'link', 'amount'],
    title: 'Credit payment overdue',
    body: '{{amount}} of credit used by {{orgName}} is past its due date. New bookings are paused until it is paid.',
    subject: 'Credit payment overdue — new bookings paused',
    text: 'Hello,\n\n{{amount}} of credit used by {{orgName}} is past its due date. New bookings are paused until the wallet is topped up.\n\nPay now: {{link}}\n\nMusafirBaba Business',
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
