// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePartnerTicket } from "../src/controllers/partner/partnerSupport.controller.js";

test("valid partner ticket", () => {
  const v = validatePartnerTicket({ issueKey: "PAYMENT", subject: "Payout not received", description: "My payout from last week is still pending." });
  assert.equal(v.error, undefined);
  assert.equal(v.ticket.service, "PARTNER");
  assert.equal(v.ticket.issueLabel, "Payment / payout");
});

test("partner ticket rules", () => {
  assert.match(validatePartnerTicket({ subject: "abc", description: "long enough text" }).error, /about/);
  assert.match(validatePartnerTicket({ issueKey: "TRIP", subject: "x", description: "long enough text" }).error, /subject/);
  assert.match(validatePartnerTicket({ issueKey: "TRIP", subject: "Fare", description: "short" }).error, /describe/);
  assert.match(validatePartnerTicket({ issueKey: "HACK", subject: "Fare", description: "long enough text" }).error, /about/);
});
