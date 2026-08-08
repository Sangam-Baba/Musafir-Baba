import { Router } from "express";
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
router.get("/geocode/search", isRiderAuthenticated, searchLocations);
router.get("/geocode/reverse", isRiderAuthenticated, reverseGeocodeLocation);

// Quote can be checked before login is required in the future; for now keep it
// behind rider auth like the rest of the booking flow.
router.post("/quote", isRiderAuthenticated, getRideQuote);
router.post("/", isRiderAuthenticated, createRide);
router.get("/my", isRiderAuthenticated, getMyRides);
router.get("/:id", isRiderAuthenticated, getRideById);
router.patch("/:id/cancel", isRiderAuthenticated, cancelRide);

export default router;
