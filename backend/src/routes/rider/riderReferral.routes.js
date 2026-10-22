import { Router } from "express";
import { isRiderAuthenticated } from "../../middleware/riderAuth.middleware.js";
import { getMyRiderReferral, applyRiderReferralCode, getMyRiderWallet, validateRiderReferralCode } from "../../controllers/rider/riderReferral.controller.js";

// MBGO Refer & Earn + MB Wallet (mounted at /rider/referral).
const router = Router();
router.get("/", isRiderAuthenticated, getMyRiderReferral);
router.post("/apply", isRiderAuthenticated, applyRiderReferralCode);
router.get("/wallet", isRiderAuthenticated, getMyRiderWallet);
export default router;

// Public (before sign-in): check a code on Create Account. Mounted at /rider-referral.
export const riderReferralPublicRoutes = Router();
riderReferralPublicRoutes.get("/validate", validateRiderReferralCode);
