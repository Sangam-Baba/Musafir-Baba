import { Router } from "express";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import {
  referralSummary,
  listReferrals,
  getReferral,
  actOnReferral,
  getPartnerReferralProfile,
  listPartnerCodes,
  getReferralSettings,
  updateReferralSettings,
} from "../controllers/adminPartnerReferral.controller.js";

// Admin: MBConnect Referral Program (mounted at /admin/partner-referrals).
const router = Router();
router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"], "partner-referrals"));
router.get("/summary", referralSummary);
router.get("/config", getReferralSettings);
router.put("/config", updateReferralSettings);
router.get("/partners", listPartnerCodes);
router.get("/partner/:authId", getPartnerReferralProfile);
router.get("/", listReferrals);
router.get("/:id", getReferral);
router.patch("/:id", actOnReferral);
export default router;
