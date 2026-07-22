import express from "express";
import {
  getPendingPartners,
  updatePartnerStatus,
  verifyDocument,
} from "../../controllers/partner/adminPartnerVerification.controller.js";
import { getPartnerLogs, addPartnerComment } from "../../controllers/partner/partnerLog.controller.js";
import protect from "../../middleware/auth.middleware.js";
import authorizedRoles from "../../middleware/roleCheck.middleware.js";

const router = express.Router();

// Apply admin authentication middleware to all routes in this file
// Assumes you have standard user auth middleware where role includes 'admin' or 'superadmin'
router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"]));

router.get("/pending", getPendingPartners);
router.put("/:partnerId/status", updatePartnerStatus);
router.put("/document/:documentId", verifyDocument);
router.get("/:partnerId/logs", getPartnerLogs);
router.post("/:partnerId/comment", addPartnerComment);

export default router;
