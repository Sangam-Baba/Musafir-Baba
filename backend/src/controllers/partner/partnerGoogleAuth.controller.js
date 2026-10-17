import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import PartnerAuth from "../../models/partner/PartnerAuth.js";
import { verifyGoogleIdToken, decideGooglePartnerAccount } from "../../services/auth/partnerGoogleAuth.service.js";

// "Continue with Google" for the MBConnect partner app. Separate from
// partnerAuth.controller.js so the email/password + OTP flows stay untouched.
// Issues exactly the same tokens/cookie/response shape as loginPartner.

const addProvider = (account, provider) => {
  const list = account.authProviders?.length ? [...account.authProviders] : ["password"];
  if (!list.includes(provider)) list.push(provider);
  return list;
};

// Token verifier (swappable only by tests).
let verifyToken = verifyGoogleIdToken;
export const __setGoogleVerifierForTests = (fn) => {
  if (process.env.NODE_ENV === "production") return;
  verifyToken = fn || verifyGoogleIdToken;
};

// A password nobody knows -- for accounts created/claimed via Google. The
// partner can still set a real one later through "Forgot password".
const unusablePasswordHash = async () => bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

// @route   POST /api/partner/auth/google
// @body    { idToken }  -- Google ID token from the app (requested for the Web client ID)
export const googleLoginPartner = async (req, res) => {
  let google;
  try {
    google = await verifyToken(req.body?.idToken);
  } catch (error) {
    console.error("Partner Google token rejected:", error.message);
    return res.status(401).json({ success: false, message: "Google sign-in failed. Please try again." });
  }

  try {
    const [byGoogleId, byEmail] = await Promise.all([
      PartnerAuth.findOne({ googleId: google.googleId }),
      PartnerAuth.findOne({ email: google.email }),
    ]);
    const decision = decideGooglePartnerAccount({ byGoogleId, byEmail });

    if (decision.action === "BLOCKED" || decision.action === "CONFLICT") {
      return res.status(403).json({ success: false, message: decision.message });
    }

    let partner = decision.account;
    let isNewAccount = false;

    if (decision.action === "CREATE") {
      // Same state as an email sign-up right after its OTP is verified
      // (verifyOTP sets isEmailVerified + status "Active"); onboarding and
      // admin approval then work exactly as for email sign-ups.
      partner = new PartnerAuth({
        email: google.email,
        password: await unusablePasswordHash(),
        isEmailVerified: true,
        status: "Active",
        googleId: google.googleId,
        authProviders: ["google"],
      });
      isNewAccount = true;
    } else if (decision.action === "LINK") {
      partner.googleId = google.googleId;
      partner.authProviders = addProvider(partner, "google");
    } else if (decision.action === "CLAIM_UNVERIFIED") {
      // Someone started sign-up with this email but never entered the OTP.
      // Google proves the real owner, so verify the account (like verifyOTP)
      // and drop the unconfirmed password (it may not be the owner's).
      partner.googleId = google.googleId;
      partner.authProviders = ["google"];
      partner.isEmailVerified = true;
      partner.status = "Active";
      partner.password = await unusablePasswordHash();
      partner.otpToken = undefined;
      partner.otpExpiry = undefined;
      partner.otpAttempts = 0;
      partner.resetPasswordToken = undefined;
      partner.resetPasswordExpiry = undefined;
      isNewAccount = true;
    }

    // Same tokens as loginPartner.
    const payload = { partnerId: partner._id, role: "Partner" };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY || "fallback_secret", { expiresIn: "1d" });
    const refreshToken = jwt.sign({ ...payload, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET_KEY || "fallback_refresh_secret", { expiresIn: "7d" });

    partner.lastLogin = new Date();
    partner.refreshToken = refreshToken;
    // Keep this device's session alongside other signed-in devices (max 5).
    partner.refreshTokens = [...(partner.refreshTokens || []), refreshToken].slice(-5);
    await partner.save();

    res.cookie("partner_refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: isNewAccount ? "Account created with Google" : "Logged in successfully",
      accessToken,
      refreshToken,
      isNewAccount,
    });
  } catch (error) {
    // Two taps at once creating the same account: the unique email/googleId
    // index rejects the second; asking to try again logs them straight in.
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Please try Google sign-in again." });
    }
    console.error("Partner Google Login Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
