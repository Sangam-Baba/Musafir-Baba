// Pure validation helpers for Help & Support tickets (tested in
// tests/supportTicket.service.test.js).
import { findService, findIssue, CONTACT_METHODS, MAX_ATTACHMENTS, TICKET_STATUSES, TICKET_PRIORITIES } from "../config/supportCatalog.js";

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

export function normalizeAttachments(input) {
  if (input === undefined || input === null) return { attachments: [] };
  if (!Array.isArray(input)) return { error: "Invalid attachments" };
  if (input.length > MAX_ATTACHMENTS) return { error: `Up to ${MAX_ATTACHMENTS} photos allowed` };
  const attachments = [];
  for (const a of input) {
    const url = String(a?.url || "");
    if (!/^https:\/\//.test(url)) return { error: "Invalid photo" };
    attachments.push({ url, key: clean(a.key, 300), format: clean(a.format, 60), size: Number(a.size) || 0 });
  }
  return { attachments };
}

// Validates a new-ticket body. Returns { ticket } (fields to save) or { error }.
export function validateNewTicket(body = {}) {
  const service = findService(body.service);
  if (!service) return { error: "Please choose a service" };
  const issue = findIssue(service, body.issueKey);
  if (!issue) return { error: "Please choose an issue" };
  const description = clean(body.description, 2000);
  if (description.length < 10) return { error: "Please describe the issue (at least 10 characters)" };
  const quickOptions = Array.isArray(body.quickOptions) ? body.quickOptions.filter((q) => issue.quick.includes(q)) : [];
  const att = normalizeAttachments(body.attachments);
  if (att.error) return { error: att.error };
  const method = CONTACT_METHODS.includes(body.preferredContact?.method) ? body.preferredContact.method : "CALL";
  return {
    ticket: {
      service: service.key,
      serviceLabel: service.label,
      issueKey: issue.key,
      issueLabel: issue.label,
      quickOptions,
      description,
      attachments: att.attachments,
      preferredContact: { method, value: clean(body.preferredContact?.value, 120) },
      expectedResolution: clean(body.expectedResolution, 500),
      // Safety issues jump the queue.
      priority: service.key === "SAFETY" ? "URGENT" : "NORMAL",
    },
    bookingKind: service.bookingKind,
  };
}

export const isValidStatus = (s) => TICKET_STATUSES.includes(s);
export const isValidPriority = (p) => TICKET_PRIORITIES.includes(p);

export const ticketCode = (n) => `MBGT${String(n).padStart(6, "0")}`;
