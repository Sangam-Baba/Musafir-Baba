import { Router } from "express";
import { isPartnerAuthenticated } from "../../middleware/partnerAuth.middleware.js";
import { getDashboardProfile, updateProfile, submitProfileForApproval } from "../../controllers/partner/partnerProfile.controller.js";
import { updateBankAccount } from "../../controllers/partner/partnerBank.controller.js";
import { addVehicle, assignDriverToVehicle } from "../../controllers/partner/partnerVehicle.controller.js";
import { addDriver, getDrivers } from "../../controllers/partner/partnerDriver.controller.js";
import { uploadDocument } from "../../controllers/partner/partnerDocument.controller.js";

const router = Router();

// Protect all routes with the isolated partner JWT middleware
router.use(isPartnerAuthenticated);

// Profile & Address
router.get("/profile/dashboard", getDashboardProfile);
router.post("/profile", updateProfile);
router.post("/profile/submit", submitProfileForApproval);

// Bank Details
router.post("/bank", updateBankAccount);

// Vehicles
router.post("/vehicle", addVehicle);
router.put("/vehicle/:vehicleId/driver", assignDriverToVehicle);

// Drivers
router.post("/driver", addDriver);
router.get("/driver", getDrivers);

// Documents
router.post("/document", uploadDocument);

export default router;
