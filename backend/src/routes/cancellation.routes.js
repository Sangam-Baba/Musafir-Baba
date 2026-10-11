import { Router } from "express";
import { isRiderAuthenticated } from "../middleware/riderAuth.middleware.js";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { getReasons, checkCancellation, createCancellation, adminListCancellations, adminDecideCancellation, adminUpdateRefund } from "../controllers/cancellation.controller.js";

// Rider cancellations (mounted at /cancellations).
const router = Router();
router.use(isRiderAuthenticated);
router.get("/reasons", getReasons);
router.get("/check", checkCancellation);
router.post("/", createCancellation);
export default router;

// Admin (mounted at /admin/cancellations).
export const adminCancellationRoutes = Router();
adminCancellationRoutes.use(protect);
adminCancellationRoutes.use(authorizedRoles(["admin", "superadmin"], "cancellations"));
adminCancellationRoutes.get("/", adminListCancellations);
adminCancellationRoutes.patch("/:id/decision", adminDecideCancellation);
adminCancellationRoutes.patch("/:id/refund", adminUpdateRefund);
