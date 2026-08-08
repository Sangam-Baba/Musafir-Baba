import express from "express";
import {
  registerRider,
  verifyOTP,
  resendOTP,
  checkEmail,
  loginRider,
  logoutRider,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../../controllers/rider/riderAuth.controller.js";
import { isRiderAuthenticated } from "../../middleware/riderAuth.middleware.js";

const router = express.Router();

// Public Routes
router.post("/register", registerRider);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/check-email", checkEmail);
router.post("/login", loginRider);
router.post("/logout", logoutRider);
router.post("/refresh", refreshAccessToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected Routes
router.post("/change-password", isRiderAuthenticated, changePassword);

export default router;
