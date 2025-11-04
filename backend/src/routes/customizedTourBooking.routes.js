import Router from "express";
import {
  createCustomizedTourBooking,
  getCustomizedTourBookingById,
  updateCustomizedTourBooking,
  deleteCustomizedTourBooking,
  getAllCustomizedTourBooking,
} from "../controllers/customizedTourBooking.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const customizedTourBookingRoute = Router();

customizedTourBookingRoute.post(
  "/",
  isAuthenticated,
  authorizedRoles(["user", "admin", "superadmin"]),
  createCustomizedTourBooking
);

customizedTourBookingRoute.get(
  "/admin",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getAllCustomizedTourBooking
);
customizedTourBookingRoute.get(
  "/:id",
  isAuthenticated,
  authorizedRoles(["user", "admin", "superadmin"]),
  getCustomizedTourBookingById
);

customizedTourBookingRoute.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["superadmin", "admin"]),
  updateCustomizedTourBooking
);

customizedTourBookingRoute.delete(
  "/:id",
  isAuthenticated,
  authorizedRoles(["superadmin", "admin"]),
  deleteCustomizedTourBooking
);

export default customizedTourBookingRoute;
