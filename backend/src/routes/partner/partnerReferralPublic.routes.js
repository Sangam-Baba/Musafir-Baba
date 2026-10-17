import { Router } from "express";
import { validateReferralCode } from "../../controllers/partner/partnerReferral.controller.js";

// Public (before sign-in): check a referral code on the Register screen.
// Mounted at /partner-referral.
const router = Router();
router.get("/validate", validateReferralCode);
export default router;
