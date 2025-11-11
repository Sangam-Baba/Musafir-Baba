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
const bookingRoutes = Router();

bookingRoutes.post(
  "/",
  isAuthenticated,
  authorizedRoles(["user", "admin"]),
  createBooking
);
bookingRoutes.post(
  "/manual",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createManualBooking
);
bookingRoutes.get(
  "/admin",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getAllBookings
);
bookingRoutes.get(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "user", "superadmin"]),
  getBookingById
);
bookingRoutes.patch(
  "/cancel/:id",
  isAuthenticated,
  authorizedRoles(["user", "admin"]),
  cancelMyBooking
);
bookingRoutes.get(
  "/",
  isAuthenticated,
  authorizedRoles(["user", "admin"]),
  getMyBookings
);
bookingRoutes.patch(
  "/status/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  adminUpdateBookingStatus
);

export default bookingRoutes;
