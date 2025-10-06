import {
  createBooking,
  getBookingsById,
  updateBooking,
} from "../controllers/membershipBooking.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
const membershipBookingRoute = Router();

membershipBookingRoute.post(
  "/",
  isAuthenticated,
  authorizedRoles(["user", "admin"]),
  createBooking
);

membershipBookingRoute.get(
  "/:id",
  isAuthenticated,
  authorizedRoles(["user", "admin"]),
  getBookingsById
);

membershipBookingRoute.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["user", "admin"]),
  updateBooking
);

export default membershipBookingRoute;
