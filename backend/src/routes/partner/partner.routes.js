import { Router } from "express";
import { isPartnerAuthenticated } from "../../middleware/partnerAuth.middleware.js";
import { getDashboardProfile, updateProfile, submitProfileForApproval, updatePushToken } from "../../controllers/partner/partnerProfile.controller.js";
import { updateBankAccount } from "../../controllers/partner/partnerBank.controller.js";
import { addVehicle, assignDriverToVehicle, updateVehicle, getVehicles, getVehicleById, deleteVehicle } from "../../controllers/partner/partnerVehicle.controller.js";
import { addDriver, getDrivers, updateDriver } from "../../controllers/partner/partnerDriver.controller.js";
import { uploadDocument } from "../../controllers/partner/partnerDocument.controller.js";
import { getStates, getCities, getPincodes } from "../../controllers/locationMaster.controller.js";
import {
  updateStatus,
  getBookings,
  updateBookingStatus,
  getEarnings,
  requestPayout,
  getNotifications,
  markNotificationsRead
} from "../../controllers/partner/partnerExtra.controller.js";

const router = Router();

// Protect all routes with the isolated partner JWT middleware
router.use(isPartnerAuthenticated);

// Profile & Address & Status
router.get("/profile/dashboard", getDashboardProfile);
router.post("/profile", updateProfile);
router.post("/profile/submit", submitProfileForApproval);
router.patch("/push-token", updatePushToken);
router.patch("/status", updateStatus);

// Bank Details
router.post("/bank", updateBankAccount);

// Vehicles
router.get("/vehicles", getVehicles);
router.get("/vehicle/:vehicleId", getVehicleById);
router.post("/vehicle", addVehicle);
router.put("/vehicle/:vehicleId", updateVehicle);
router.delete("/vehicle/:vehicleId", deleteVehicle);
router.put("/vehicle/:vehicleId/driver", assignDriverToVehicle);

// Drivers
router.post("/driver", addDriver);
router.put("/driver/:driverId", updateDriver);
router.get("/driver", getDrivers);

// Bookings
router.get("/bookings", getBookings);
router.patch("/bookings/:id/status", updateBookingStatus);

// Earnings & Payouts
router.get("/earnings", getEarnings);
router.post("/payouts/request", requestPayout);

// Notifications
router.get("/notifications", getNotifications);
router.patch("/notifications/mark-read", markNotificationsRead);

// Documents
router.post("/document", uploadDocument);

// Locations (Read-Only)
router.get("/states", getStates);
router.get("/cities", getCities);
router.get("/pincodes", getPincodes);

// Settings
import { getSettings, updateSettings } from "../../controllers/partner/partnerSettings.controller.js";
router.get("/settings", getSettings);
router.post("/settings", updateSettings);

export default router;
