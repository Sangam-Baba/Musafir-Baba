import { Router } from "express";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import {
  riderReferralSummary,
  listRiderReferrals,
  getRiderReferral,
  actOnRiderReferral,
  listRiderCodes,
  getRiderWalletHistory,
  getRiderReferralSettings,
  updateRiderReferralSettings,
} from "../controllers/adminRiderReferral.controller.js";

// Admin: MBGO Referral Program + MB Wallet (mounted at /admin/rider-referrals).
const router = Router();
router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"], "rider-referrals"));
router.get("/summary", riderReferralSummary);
router.get("/config", getRiderReferralSettings);
router.put("/config", updateRiderReferralSettings);
router.get("/riders", listRiderCodes);
router.get("/rider/:authId/wallet", getRiderWalletHistory);
router.get("/", listRiderReferrals);
router.get("/:id", getRiderReferral);
router.patch("/:id", actOnRiderReferral);
export default router;
