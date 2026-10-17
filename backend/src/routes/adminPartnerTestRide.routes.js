import { Router } from "express";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { getConfig, updateConfig, getCities, getDrivers, preview, broadcast, listBroadcasts, endBroadcast } from "../controllers/partnerTestRide.controller.js";

// Admin: MBConnect Test Rides (mounted at /admin/partner-test-rides).
const router = Router();
router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"], "partner-test-rides"));
router.get("/config", getConfig);
router.put("/config", updateConfig);
router.get("/cities", getCities);
router.get("/drivers", getDrivers);
router.post("/preview", preview);
router.post("/broadcast", broadcast);
router.get("/broadcasts", listBroadcasts);
router.post("/broadcasts/:id/end", endBroadcast);
export default router;
