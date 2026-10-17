// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideGooglePartnerAccount, verifyGoogleIdToken } from "../src/services/auth/partnerGoogleAuth.service.js";

const acct = (o) => ({ status: "Active", isEmailVerified: true, ...o });

test("partner: new email -> create", () => {
  assert.equal(decideGooglePartnerAccount({ byGoogleId: null, byEmail: null }).action, "CREATE");
});

test("partner: already linked -> login", () => {
  const a = acct({ googleId: "g1" });
  assert.deepEqual(decideGooglePartnerAccount({ byGoogleId: a, byEmail: a }), { action: "LOGIN", account: a });
});

test("partner: verified password account -> link", () => {
  assert.equal(decideGooglePartnerAccount({ byGoogleId: null, byEmail: acct({}) }).action, "LINK");
});

test("partner: sign-up whose OTP was never entered -> claim", () => {
  const a = acct({ isEmailVerified: false, status: "Draft" });
  assert.equal(decideGooglePartnerAccount({ byGoogleId: null, byEmail: a }).action, "CLAIM_UNVERIFIED");
});

test("partner: suspended / deleted / blacklisted -> blocked with loginPartner's messages", () => {
  const msg = (status) => decideGooglePartnerAccount({ byGoogleId: null, byEmail: acct({ status }) });
  assert.equal(msg("Suspended").message, "Your account is suspended. Contact admin.");
  assert.equal(msg("Deleted").message, "This account has been deleted. Contact admin.");
  assert.equal(msg("Blacklisted").message, "This account has been blocked. Contact admin.");
  assert.equal(decideGooglePartnerAccount({ byGoogleId: acct({ googleId: "g", status: "Suspended" }), byEmail: null }).action, "BLOCKED");
});

test("partner: approval states (Hold / Rejected / PendingVerification / Approved) still log in like email login", () => {
  for (const status of ["Hold", "Rejected", "PendingVerification", "Approved", "In-Active"]) {
    assert.equal(decideGooglePartnerAccount({ byGoogleId: acct({ googleId: "g", status }), byEmail: null }).action, "LOGIN", status);
  }
});

test("partner: email linked to another Google account -> conflict", () => {
  assert.equal(decideGooglePartnerAccount({ byGoogleId: null, byEmail: acct({ googleId: "other" }) }).action, "CONFLICT");
});

test("partner: verifier rejects missing/garbage tokens", async () => {
  await assert.rejects(verifyGoogleIdToken(""));
  await assert.rejects(verifyGoogleIdToken("not-a-jwt"));
});
