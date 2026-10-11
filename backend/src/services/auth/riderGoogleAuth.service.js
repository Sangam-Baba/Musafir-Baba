// "Continue with Google" for MBGo riders: Google ID-token verification and the
// account rules. The rules are a pure function (decideGoogleRiderAccount) so
// every case is unit-tested in tests/riderGoogleAuth.service.test.js.
import { OAuth2Client } from "google-auth-library";

// The Google Cloud "Web" OAuth client ID (project mbgo). Public, not a secret.
// The Android app requests ID tokens for this client, so this is the audience.
export const GOOGLE_WEB_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || "574244144608-4ce8fh7vlauocu8tabtjuk29vci0voc2.apps.googleusercontent.com";

const client = new OAuth2Client();

/**
 * Verifies a Google ID token (signature, expiry, issuer, audience).
 * @returns {{ googleId, email, name, picture }} or throws.
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") throw new Error("Missing Google token");
  const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_WEB_CLIENT_ID });
  const p = ticket.getPayload() || {};
  if (!p.sub || !p.email) throw new Error("Google account has no email");
  if (p.email_verified !== true) throw new Error("Google email is not verified");
  return {
    googleId: String(p.sub),
    email: String(p.email).trim().toLowerCase(),
    name: String(p.name || p.given_name || "").trim(),
    picture: p.picture || "",
  };
}

/**
 * What to do for a verified Google identity.
 * @param {object|null} byGoogleId  RiderAuth already linked to this Google account
 * @param {object|null} byEmail     RiderAuth with the same email
 * @returns {{ action: "LOGIN"|"LINK"|"CLAIM_UNVERIFIED"|"CREATE"|"BLOCKED"|"CONFLICT", account?, message? }}
 *  LOGIN             already linked -> just log in
 *  LINK              verified password account with this email -> add Google, log in
 *  CLAIM_UNVERIFIED  abandoned (never verified) sign-up -> verify via Google, wipe its unconfirmed password
 *  CREATE            no account -> create one (verified, Active)
 *  BLOCKED           suspended / deleted
 *  CONFLICT          email account already linked to a different Google account
 */
export function decideGoogleRiderAccount({ byGoogleId, byEmail }) {
  const account = byGoogleId || byEmail;
  if (account && (account.status === "Suspended" || account.status === "Deleted")) {
    return {
      action: "BLOCKED",
      account,
      message:
        account.status === "Suspended"
          ? "Your account is suspended. Contact support."
          : "This account has been deleted. Contact support.",
    };
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
