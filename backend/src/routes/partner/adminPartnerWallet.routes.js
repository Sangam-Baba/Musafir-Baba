import express from "express";
import {
  getPartnerWallets,
  getPartnerWalletDetail,
  releasePendingFunds,
  adjustWalletBalance,
} from "../../controllers/partner/adminPartnerWallet.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizedRoles from "../../middleware/roleCheck.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"]));

router.get("/", getPartnerWallets);
router.get("/:partnerId", getPartnerWalletDetail);
router.post("/:partnerId/release", releasePendingFunds);
router.post("/:partnerId/adjust", adjustWalletBalance);

export default router;
