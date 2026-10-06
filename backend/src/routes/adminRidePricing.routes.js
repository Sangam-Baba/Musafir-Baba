import express from "express";
import {
  getRidePricingConfig,
  updateRidePricingConfig,
  previewRideFare,
} from "../controllers/adminRidePricing.controller.js";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const router = express.Router();

// Admin/superadmin only. The explicit "ride-pricing" permission stops staff
// from inheriting access through roleCheck's "/api/admin" -> "role" URL
// inference -- no staff role is granted "ride-pricing" today.
router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"], "ride-pricing"));

router.get("/", getRidePricingConfig);
router.put("/", updateRidePricingConfig);
router.post("/preview", previewRideFare);

export default router;
