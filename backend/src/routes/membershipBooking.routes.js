import {
  createBooking,
  getBookingsById,
  updateBooking,
  getMyBookings,
} from "../controllers/membershipBooking.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";
const membershipBookingRoute = Router();

membershipBookingRoute.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin"]),
  createBooking
);

membershipBookingRoute.get(
  "/my",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user"]),
  getMyBookings
);

membershipBookingRoute.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin"]),
  getBookingsById
);

membershipBookingRoute.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin"]),
  updateBooking
);

export default membershipBookingRoute;
