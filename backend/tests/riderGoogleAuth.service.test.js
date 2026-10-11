// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideGoogleRiderAccount, verifyGoogleIdToken } from "../src/services/auth/riderGoogleAuth.service.js";

const acct = (o) => ({ status: "Active", isEmailVerified: true, ...o });

test("new email -> create", () => {
  assert.equal(decideGoogleRiderAccount({ byGoogleId: null, byEmail: null }).action, "CREATE");
});

test("already linked -> login", () => {
  const a = acct({ googleId: "g1" });
  assert.deepEqual(decideGoogleRiderAccount({ byGoogleId: a, byEmail: a }), { action: "LOGIN", account: a });
});

test("verified password account -> link (password keeps working)", () => {
  const a = acct({});
  assert.equal(decideGoogleRiderAccount({ byGoogleId: null, byEmail: a }).action, "LINK");
});

test("abandoned unverified sign-up -> claim (unconfirmed password wiped)", () => {
  const a = acct({ isEmailVerified: false, status: "PendingVerification" });
  assert.equal(decideGoogleRiderAccount({ byGoogleId: null, byEmail: a }).action, "CLAIM_UNVERIFIED");
});

test("suspended / deleted -> blocked with the same messages as email login", () => {
  const s = decideGoogleRiderAccount({ byGoogleId: null, byEmail: acct({ status: "Suspended" }) });
  assert.equal(s.action, "BLOCKED");
  assert.equal(s.message, "Your account is suspended. Contact support.");
  const d = decideGoogleRiderAccount({ byGoogleId: acct({ status: "Deleted", googleId: "g" }), byEmail: null });
  assert.equal(d.action, "BLOCKED");
  assert.equal(d.message, "This account has been deleted. Contact support.");
});

test("email linked to a different Google account -> conflict", () => {
  const a = acct({ googleId: "other" });
  assert.equal(decideGoogleRiderAccount({ byGoogleId: null, byEmail: a }).action, "CONFLICT");
});

test("missing / fake tokens are rejected", async () => {
  await assert.rejects(() => verifyGoogleIdToken(undefined));
  await assert.rejects(() => verifyGoogleIdToken("not-a-jwt"));
  const fake = [Buffer.from('{"alg":"RS256","kid":"x"}').toString("base64url"), Buffer.from('{"sub":"1","email":"a@b.co","email_verified":true}').toString("base64url"), "sig"].join(".");
  await assert.rejects(() => verifyGoogleIdToken(fake));
});
