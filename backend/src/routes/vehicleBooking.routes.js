import { Router } from "express";

import {
  createBooking,
  getAllBookings,
  getBookingById,
  getBookingsByUserId,
} from "../controllers/vehicleBooking.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const vehicleBookingsRoutes = Router();

vehicleBookingsRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin", "superadmin"]),
  createBooking,
);

vehicleBookingsRoutes.get(
  "/all",
  isAuthenticated,
  validateSession,
  authorizedRoles("admin", "superadmin"),
  getAllBookings,
);

vehicleBookingsRoutes.get(
  "/userId",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin", "superadmin"]),
  getBookingsByUserId,
);

vehicleBookingsRoutes.get(
  "/id/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getBookingById,
);

export default vehicleBookingsRoutes;
