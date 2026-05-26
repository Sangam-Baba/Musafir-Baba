import express from "express";
import { getMyHistory, getAllHistory } from "../controllers/audit.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(isAuthenticated);

// Normal staff can only get their own history
router.get("/my-history", getMyHistory);

// Only Superadmins (and Admins, if appropriate) can view all history
router.get("/all", authorizedRoles(["superadmin", "admin"]), getAllHistory);

export default router;
