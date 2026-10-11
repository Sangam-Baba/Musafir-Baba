import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import RiderAuth from "../../models/rider/RiderAuth.js";
import RiderProfile from "../../models/rider/RiderProfile.js";
import { verifyGoogleIdToken, decideGoogleRiderAccount } from "../../services/auth/riderGoogleAuth.service.js";

// "Continue with Google" for the MBGo rider app. Separate from
// riderAuth.controller.js so the email/password + OTP flows stay untouched.
// Issues exactly the same tokens/cookie/response shape as loginRider.

const addProvider = (account, provider) => {
  const list = account.authProviders?.length ? [...account.authProviders] : ["password"];
  if (!list.includes(provider)) list.push(provider);
  return list;
};

// Token verifier (swappable only by tests -- see tests/scripts).
let verifyToken = verifyGoogleIdToken;
export const __setGoogleVerifierForTests = (fn) => {
  if (process.env.NODE_ENV === "production") return;
  verifyToken = fn || verifyGoogleIdToken;
};

// A password nobody knows -- for accounts created/claimed via Google. The
// rider can still set a real one later through "Forgot password".
const unusablePasswordHash = async () => bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

// @route   POST /api/rider/auth/google
// @body    { idToken }  -- Google ID token from the app (requested for the Web client ID)
export const googleLoginRider = async (req, res) => {
  let google;
  try {
    google = await verifyToken(req.body?.idToken);
  } catch (error) {
    console.error("Rider Google token rejected:", error.message);
    return res.status(401).json({ success: false, message: "Google sign-in failed. Please try again." });
  }

  try {
    const [byGoogleId, byEmail] = await Promise.all([
      RiderAuth.findOne({ googleId: google.googleId }),
      RiderAuth.findOne({ email: google.email }),
    ]);
    const decision = decideGoogleRiderAccount({ byGoogleId, byEmail });

    if (decision.action === "BLOCKED" || decision.action === "CONFLICT") {
      return res.status(403).json({ success: false, message: decision.message });
    }

    let rider = decision.account;
    let isNewAccount = false;

    if (decision.action === "CREATE") {
      rider = new RiderAuth({
        email: google.email,
        password: await unusablePasswordHash(),
        isEmailVerified: true,
        status: "Active",
        googleId: google.googleId,
        authProviders: ["google"],
      });
      await rider.save();
      await RiderProfile.findOneAndUpdate(
        { authId: rider._id },
        { $setOnInsert: { fullName: google.name || google.email.split("@")[0], mobileNumber: "" } },
        { upsert: true, new: true }
      );
      isNewAccount = true;
    } else if (decision.action === "LINK") {
      rider.googleId = google.googleId;
      rider.authProviders = addProvider(rider, "google");
    } else if (decision.action === "CLAIM_UNVERIFIED") {
      // Someone started sign-up with this email but never confirmed the OTP.
      // Google proves the real owner, so verify the account and drop the
      // unconfirmed password/name/mobile (they may not be the owner's).
      rider.googleId = google.googleId;
      rider.authProviders = ["google"];
      rider.isEmailVerified = true;
      rider.status = "Active";
      rider.password = await unusablePasswordHash();
      rider.otpToken = undefined;
      rider.otpExpiry = undefined;
      rider.resetPasswordToken = undefined;
      rider.resetPasswordExpiry = undefined;
      await RiderProfile.findOneAndUpdate(
        { authId: rider._id },
        { $set: { fullName: google.name || google.email.split("@")[0], mobileNumber: "" } },
        { upsert: true, new: true }
      );
      isNewAccount = true;
    }

    // Same tokens as loginRider.
    const payload = { riderId: rider._id, role: "Rider" };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY || "fallback_secret", { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET_KEY || "fallback_refresh_secret", { expiresIn: "7d" });

    rider.lastLogin = new Date();
    rider.refreshToken = refreshToken;
    await rider.save();

    res.cookie("rider_refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    // Existing accounts without a profile (shouldn't happen, but be safe).
    let profile = await RiderProfile.findOne({ authId: rider._id });
    if (!profile) {
      profile = await RiderProfile.create({ authId: rider._id, fullName: google.name || google.email.split("@")[0], mobileNumber: "" });
    }

    return res.status(200).json({
      success: true,
      message: isNewAccount ? "Account created with Google" : "Logged in successfully",
      accessToken,
      refreshToken,
      isNewAccount,
      profile: { fullName: profile.fullName, mobileNumber: profile.mobileNumber, profilePicture: profile.profilePicture },
    });
  } catch (error) {
    console.error("Rider Google Login Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
