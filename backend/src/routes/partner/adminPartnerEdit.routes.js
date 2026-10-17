import express from "express";
import protect from "../../middleware/auth.middleware.js";
import authorizedRoles from "../../middleware/roleCheck.middleware.js";
import {
  editProfile,
  editBank,
  addVehicle,
  editVehicle,
  removeVehicle,
  addDriver,
  editDriver,
  removeDriver,
  uploadDocument,
  editDocument,
  changeEmail,
  sendPasswordReset,
  unlinkGoogle,
  editSettings,
} from "../../controllers/partner/adminPartnerEdit.controller.js";

// Admin: edit every part of a partner account (mounted at /admin/partner-edit).
// Same access as Partner Verification.
const router = express.Router();
router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"]));

router.put("/vehicles/:vehicleId", editVehicle);
router.delete("/vehicles/:vehicleId", removeVehicle);
router.put("/drivers/:driverId", editDriver);
router.delete("/drivers/:driverId", removeDriver);
router.put("/documents/:documentId", editDocument);
router.put("/:authId/profile", editProfile);
router.put("/:authId/bank", editBank);
router.post("/:authId/vehicles", addVehicle);
router.post("/:authId/drivers", addDriver);
router.post("/:authId/documents", uploadDocument);
router.put("/:authId/email", changeEmail);
router.post("/:authId/password-reset", sendPasswordReset);
router.post("/:authId/unlink-google", unlinkGoogle);
router.put("/:authId/settings", editSettings);

export default router;
