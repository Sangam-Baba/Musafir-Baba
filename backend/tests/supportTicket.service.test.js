// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateNewTicket, normalizeAttachments, ticketCode } from "../src/services/supportTicket.service.js";
import { SUPPORT_SERVICES } from "../src/config/supportCatalog.js";

const base = { service: "CAB", issueKey: "DRIVER_NOT_ARRIVED", description: "Driver is 25 minutes late at pickup." };

test("valid cab ticket", () => {
  const v = validateNewTicket({ ...base, quickOptions: ["Driver is late", "hacked option"], preferredContact: { method: "WHATSAPP", value: "98765" } });
  assert.equal(v.ticket.issueLabel, "Driver not arrived");
  assert.deepEqual(v.ticket.quickOptions, ["Driver is late"]);
  assert.equal(v.ticket.preferredContact.method, "WHATSAPP");
  assert.equal(v.ticket.priority, "NORMAL");
  assert.equal(v.bookingKind, "RIDE");
});

test("rejects unknown service / issue / short description", () => {
  assert.ok(validateNewTicket({ ...base, service: "X" }).error);
  assert.ok(validateNewTicket({ ...base, issueKey: "NOPE" }).error);
  assert.ok(validateNewTicket({ ...base, description: "late" }).error);
});

test("safety tickets are urgent", () => {
  assert.equal(validateNewTicket({ service: "SAFETY", issueKey: "UNSAFE", description: "Driver was driving rashly." }).ticket.priority, "URGENT");
});

test("attachments: https only, max 5", () => {
  const a = { url: "https://cdn.musafirbaba.com/x.jpg" };
  assert.equal(normalizeAttachments([a, a]).attachments.length, 2);
  assert.ok(normalizeAttachments([a, a, a, a, a, a]).error);
  assert.ok(normalizeAttachments([{ url: "http://x" }]).error);
});

test("ticket code + catalogue sanity", () => {
  assert.equal(ticketCode(123), "MBGT000123");
  for (const s of SUPPORT_SERVICES) {
    assert.ok(s.issues.length > 0, s.key);
    assert.equal(new Set(s.issues.map((i) => i.key)).size, s.issues.length, s.key);
  }
});
