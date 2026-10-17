import express from "express";
import {
  registerPartner,
  verifyOTP,
  resendOTP,
  checkEmail,
  loginPartner,
  logoutPartner,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../../controllers/partner/partnerAuth.controller.js";
import { googleLoginPartner } from "../../controllers/partner/partnerGoogleAuth.controller.js";
import { isPartnerAuthenticated } from "../../middleware/partnerAuth.middleware.js";

const router = express.Router();

// Public Routes
router.post("/register", registerPartner);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/check-email", checkEmail);
router.post("/login", loginPartner);
router.post("/google", googleLoginPartner); // "Continue with Google"
router.post("/logout", logoutPartner);
router.post("/refresh", refreshAccessToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected Routes
router.post("/change-password", isPartnerAuthenticated, changePassword);

export default router;
