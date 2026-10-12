import express from "express";
import { getFleetAnalytics } from "../controllers/adminFleetAnalytics.controller.js";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

// Read-only Fleet Dashboard analytics. Same access as the other fleet admin
// routes (e.g. adminRide.routes.js).
const router = express.Router();

router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"]));

router.get("/", getFleetAnalytics);

export default router;
