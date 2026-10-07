import { Router } from "express";
import { isRiderAuthenticated } from "../middleware/riderAuth.middleware.js";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import {
  createTourAppBooking,
  getMyTourAppBookings,
  getTourAppBookingById,
  initiateTourAppPayment,
  verifyTourAppPaymentSuccess,
  verifyTourAppPaymentFailure,
  adminListTourAppBookings,
} from "../controllers/tourAppBooking.controller.js";

// Holiday-package bookings from the MBGo rider app (mounted at /tour-booking).
const router = Router();

// PayU posts back here (no auth -- verified by hash). Registered before "/:id".
router.post("/payment/success", verifyTourAppPaymentSuccess);
router.post("/payment/failure", verifyTourAppPaymentFailure);

router.post("/", isRiderAuthenticated, createTourAppBooking);
router.get("/my", isRiderAuthenticated, getMyTourAppBookings);
router.get("/:id", isRiderAuthenticated, getTourAppBookingById);
router.post("/:id/pay", isRiderAuthenticated, initiateTourAppPayment);

export default router;

// Admin list (mounted at /admin/tour-app-bookings). The explicit permission
// keeps staff from inheriting access via roleCheck's "/api/admin" inference.
export const adminTourAppBookingRoutes = Router();
adminTourAppBookingRoutes.use(protect);
adminTourAppBookingRoutes.use(authorizedRoles(["admin", "superadmin"], "tour-app-bookings"));
adminTourAppBookingRoutes.get("/", adminListTourAppBookings);
