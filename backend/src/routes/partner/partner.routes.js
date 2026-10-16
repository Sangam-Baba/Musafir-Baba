import { Router } from "express";
import { isPartnerAuthenticated } from "../../middleware/partnerAuth.middleware.js";
import { getDashboardProfile, updateProfile, submitProfileForApproval, updatePushToken } from "../../controllers/partner/partnerProfile.controller.js";
import { updateBankAccount } from "../../controllers/partner/partnerBank.controller.js";
import { addVehicle, assignDriverToVehicle, updateVehicle, getVehicles, getVehicleById, deleteVehicle } from "../../controllers/partner/partnerVehicle.controller.js";
import { addDriver, getDrivers, updateDriver } from "../../controllers/partner/partnerDriver.controller.js";
import { uploadDocument } from "../../controllers/partner/partnerDocument.controller.js";
import { getStates, getCities, getPincodes } from "../../controllers/locationMaster.controller.js";
import { getMyPayouts, requestWithdrawal, cancelMyWithdrawal } from "../../controllers/partner/partnerPayout.controller.js";
import { getMyWallet, initiateRecharge, getDriverCancelReasons, previewDriverCancel, driverCancelRide } from "../../controllers/partner/partnerWallet.controller.js";
import { getPartnerSupportCatalog, getPartnerSupportTrips, createPartnerTicket, getPartnerTickets, getPartnerTicket, partnerReply } from "../../controllers/partner/partnerSupport.controller.js";
import {
  updateStatus,
  getBookings,
  getAvailableRides,
  acceptRide,
  updateBookingStatus,
  markRoundTripEvent,
  getEarnings,
  getNotifications,
  markNotificationsRead, markOneNotificationRead,
  getRealtimeToken
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
router.patch("/bookings/:id/round-trip", markRoundTripEvent);

// Ride pool (accept-first-wins)
router.get("/rides/available", getAvailableRides);
router.post("/rides/:id/accept", acceptRide);

// Earnings & Payouts
router.get("/earnings", getEarnings);
// Withdrawals to bank (recorded; admin marks them paid / cancelled).
router.get("/payouts", getMyPayouts);
router.post("/payouts", requestWithdrawal);
router.post("/payouts/request", requestWithdrawal); // older path, same recorded flow
router.post("/payouts/:id/cancel", cancelMyWithdrawal);

// Notifications
router.get("/notifications", getNotifications);
router.patch("/notifications/mark-read", markNotificationsRead);
router.patch("/notifications/:id/read", markOneNotificationRead);

// Help Center tickets (shown in admin > Support Tickets)
router.get("/support/catalog", getPartnerSupportCatalog);
router.get("/support/trips", getPartnerSupportTrips);
router.get("/support/tickets", getPartnerTickets);
router.post("/support/tickets", createPartnerTicket);
router.get("/support/tickets/:id", getPartnerTicket);
router.post("/support/tickets/:id/messages", partnerReply);

// Partner Wallet program (recharge balance, driver cancellation)
router.get("/wallet", getMyWallet);
router.post("/wallet/recharge", initiateRecharge);
router.get("/cancel-reasons", getDriverCancelReasons);
router.get("/bookings/:id/cancel-preview", previewDriverCancel);
router.post("/bookings/:id/cancel", driverCancelRide);
router.get("/notifications/realtime-token", getRealtimeToken);

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
