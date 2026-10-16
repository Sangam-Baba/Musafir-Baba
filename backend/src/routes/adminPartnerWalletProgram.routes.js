import { Router } from "express";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import {
  getWalletProgramConfig,
  updateWalletProgramConfig,
  listDriverCancellations,
  decideDriverCancellation,
} from "../controllers/adminPartnerWalletProgram.controller.js";

// Admin: MBConnect Partner Wallet program (mounted at /admin/partner-wallet-program).
const router = Router();
router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"], "partner-wallet-program"));
router.get("/config", getWalletProgramConfig);
router.put("/config", updateWalletProgramConfig);
router.get("/cancellations", listDriverCancellations);
router.patch("/cancellations/:id", decideDriverCancellation);
export default router;
