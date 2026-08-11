import express from "express";
import {
  getAllRides,
  getRideDetail,
  getEligiblePartners,
  broadcastToPartners,
  assignRideToPartner,
  releaseRide,
  reassignRide,
  adminCancelRide,
} from "../controllers/adminRide.controller.js";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const router = express.Router();

// Apply admin authentication middleware to all routes in this file
router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"]));

router.get("/", getAllRides);
router.get("/:id", getRideDetail);
router.get("/:id/eligible-partners", getEligiblePartners);
router.post("/:id/broadcast", broadcastToPartners);
router.post("/:id/assign", assignRideToPartner);
router.post("/:id/release", releaseRide);
router.patch("/:id/reassign", reassignRide);
router.patch("/:id/cancel", adminCancelRide);

export default router;
