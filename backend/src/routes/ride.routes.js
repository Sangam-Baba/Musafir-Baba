import { Router } from "express";
import { initiateExtraTimePayment, verifyExtraTimePaymentSuccess, verifyExtraTimePaymentFailure } from "../controllers/rideExtra.controller.js";
import { isRiderAuthenticated } from "../middleware/riderAuth.middleware.js";
import {
  getRideQuote,
  createRide,
  getRideById,
  getMyRides,
  cancelRide,
  searchLocations,
  reverseGeocodeLocation,
} from "../controllers/ride.controller.js";

const router = Router();

// Registered before "/:id" so "geocode" is never captured as a ride id.
// Public: location search/reverse-geocode and the fare quote don't read or
// write anything rider-specific (no req.riderId use in their controllers),
// so a guest can search and see prices before logging in; login is only
// required starting at createRide, once they actually book.
router.get("/geocode/search", searchLocations);
router.get("/geocode/reverse", reverseGeocodeLocation);
router.post("/quote", getRideQuote);
// City round trips: extra-time payment (PayU posts back without auth -- verified by hash).
router.post("/extra-payment/success", verifyExtraTimePaymentSuccess);
router.post("/extra-payment/failure", verifyExtraTimePaymentFailure);
router.post("/:id/extra/pay", isRiderAuthenticated, initiateExtraTimePayment);
router.post("/", isRiderAuthenticated, createRide);
router.get("/my", isRiderAuthenticated, getMyRides);
router.get("/:id", isRiderAuthenticated, getRideById);
router.patch("/:id/cancel", isRiderAuthenticated, cancelRide);

export default router;
