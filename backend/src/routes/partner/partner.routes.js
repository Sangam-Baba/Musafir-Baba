import { Router } from "express";
import { isPartnerAuthenticated } from "../../middleware/partnerAuth.middleware.js";
import { getDashboardProfile, updateProfile } from "../../controllers/partner/partnerProfile.controller.js";
import { updateBankAccount } from "../../controllers/partner/partnerBank.controller.js";
import { addVehicle } from "../../controllers/partner/partnerVehicle.controller.js";
import { uploadDocument } from "../../controllers/partner/partnerDocument.controller.js";

const router = Router();

// Protect all routes with the isolated partner JWT middleware
router.use(isPartnerAuthenticated);

// Profile & Address
router.get("/profile/dashboard", getDashboardProfile);
router.post("/profile", updateProfile);

// Bank Details
router.post("/bank", updateBankAccount);

// Vehicles
router.post("/vehicle", addVehicle);

// Documents
router.post("/document", uploadDocument);

export default router;
