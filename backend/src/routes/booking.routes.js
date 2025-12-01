import {
  createBooking,
  getAllBookings,
  getBookingById,
  cancelMyBooking,
  getMyBookings,
  adminUpdateBookingStatus,
  createManualBooking,
} from "../controllers/booking.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";
const bookingRoutes = Router();

bookingRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin"]),
  createBooking
);
bookingRoutes.post(
  "/manual",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createManualBooking
);
bookingRoutes.get(
  "/admin",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllBookings
);
bookingRoutes.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "user", "superadmin"]),
  getBookingById
);
bookingRoutes.patch(
  "/cancel/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin"]),
  cancelMyBooking
);
bookingRoutes.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin"]),
  getMyBookings
);
bookingRoutes.patch(
  "/status/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  adminUpdateBookingStatus
);

export default bookingRoutes;
