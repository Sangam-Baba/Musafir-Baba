import Router from "express";
import {
  createCustomizedTourBooking,
  getCustomizedTourBookingById,
  updateCustomizedTourBooking,
  deleteCustomizedTourBooking,
  getAllCustomizedTourBooking,
  createManualCustomizedTourBooking,
  getMyCustomizedTourBooking,
} from "../controllers/customizedTourBooking.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const customizedTourBookingRoute = Router();

customizedTourBookingRoute.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin", "superadmin"]),
  createCustomizedTourBooking
);

customizedTourBookingRoute.post(
  "/manual",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createManualCustomizedTourBooking
);

customizedTourBookingRoute.get(
  "/admin",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllCustomizedTourBooking
);
customizedTourBookingRoute.get(
  "/my",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user"]),
  getMyCustomizedTourBooking
);
customizedTourBookingRoute.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getCustomizedTourBookingById
);

customizedTourBookingRoute.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["superadmin", "admin"]),
  updateCustomizedTourBooking
);

customizedTourBookingRoute.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["superadmin", "admin"]),
  deleteCustomizedTourBooking
);

export default customizedTourBookingRoute;
