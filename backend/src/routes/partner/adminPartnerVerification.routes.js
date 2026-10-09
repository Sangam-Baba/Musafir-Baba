import express from "express";
import {
  getPendingPartners,
  getPartnerDetails,
  getPartnerDeleteImpact,
  deletePartner,
  restorePartner,
  getBulkDeleteImpact,
  bulkDeletePartners,
  updatePartnerStatus,
  verifyDocument,
  updatePartnerProfile,
  verifyBank,
  verifyVehicle,
  verifyDriver,
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
router.post("/bulk-delete-impact", getBulkDeleteImpact);
router.post("/bulk-delete", bulkDeletePartners);
router.get("/:partnerId/details", getPartnerDetails);
router.get("/:partnerId/delete-impact", getPartnerDeleteImpact);
router.delete("/:partnerId", deletePartner);
router.post("/:partnerId/restore", restorePartner);
router.put("/:partnerId/status", updatePartnerStatus);
router.put("/:partnerId/profile", updatePartnerProfile);
router.put("/document/:documentId", verifyDocument);
router.put("/bank/:bankId/verify", verifyBank);
router.put("/vehicle/:vehicleId/verify", verifyVehicle);
router.put("/driver/:driverId/verify", verifyDriver);
router.get("/:partnerId/logs", getPartnerLogs);
router.post("/:partnerId/comment", addPartnerComment);

export default router;
