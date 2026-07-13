import express from "express";
import {
  registerPartner,
  verifyOTP,
  loginPartner,
} from "../../controllers/partner/partnerAuth.controller.js";

const router = express.Router();

// Public Routes
router.post("/register", registerPartner);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginPartner);

export default router;
