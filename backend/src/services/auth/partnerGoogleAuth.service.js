// "Continue with Google" for MBConnect partners (drivers). Token verification
// is shared with MBGo (same Google project and Web client ID; the MBConnect
// Android app has its own Android OAuth clients in that project). The account
// rules are a pure function so every case is unit-tested in
// tests/partnerGoogleAuth.service.test.js.
export { verifyGoogleIdToken } from "./riderGoogleAuth.service.js";

// Same statuses (and messages) that block email/password login in loginPartner.
const BLOCKED_MESSAGES = {
  Suspended: "Your account is suspended. Contact admin.",
  Deleted: "This account has been deleted. Contact admin.",
  Blacklisted: "This account has been blocked. Contact admin.",
};

/**
 * What to do for a verified Google identity.
 * @param {object|null} byGoogleId  PartnerAuth already linked to this Google account
 * @param {object|null} byEmail     PartnerAuth with the same email
 * @returns {{ action: "LOGIN"|"LINK"|"CLAIM_UNVERIFIED"|"CREATE"|"BLOCKED"|"CONFLICT", account?, message? }}
 *  LOGIN             already linked -> just log in
 *  LINK              verified password account with this email -> add Google, log in
 *  CLAIM_UNVERIFIED  sign-up whose email OTP was never entered -> Google proves the email, verify it
 *  CREATE            no account -> create one (email verified, status Active, then normal onboarding)
 *  BLOCKED           suspended / deleted / blacklisted
 *  CONFLICT          email account already linked to a different Google account
 */
export function decideGooglePartnerAccount({ byGoogleId, byEmail }) {
  const account = byGoogleId || byEmail;
  if (account && BLOCKED_MESSAGES[account.status]) {
    return { action: "BLOCKED", account, message: BLOCKED_MESSAGES[account.status] };
  }
  if (byGoogleId) return { action: "LOGIN", account: byGoogleId };
  if (byEmail) {
    if (byEmail.googleId) {
      return { action: "CONFLICT", account: byEmail, message: "This email is linked to a different Google account." };
    }
    return { action: byEmail.isEmailVerified ? "LINK" : "CLAIM_UNVERIFIED", account: byEmail };
  }
  return { action: "CREATE" };
}
