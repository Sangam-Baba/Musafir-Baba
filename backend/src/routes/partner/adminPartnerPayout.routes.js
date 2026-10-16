import express from "express";
import { adminListPayouts, adminUpdatePayout } from "../../controllers/partner/partnerPayout.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizedRoles from "../../middleware/roleCheck.middleware.js";

// Admin: MBConnect driver withdrawals to bank (mounted at /admin/partner-payouts).
// Same access as Partner Wallets.
const router = express.Router();

router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"]));

router.get("/", adminListPayouts);
router.patch("/:id", adminUpdatePayout);

export default router;
