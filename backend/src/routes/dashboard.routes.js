import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import {
  getDashboardSummary,
  getMonthlyBookings,
  getBookingVSVisaEnquiry,
  getLatestAcitvity,
} from "../controllers/dashboard.controller.js";

const dashboardRoute = Router();

dashboardRoute.get(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getDashboardSummary
);

dashboardRoute.get(
  "/monthly-bookings",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getMonthlyBookings
);

dashboardRoute.get(
  "/visa-vs-booking",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getBookingVSVisaEnquiry
);

dashboardRoute.get(
  "/latest-activity",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getLatestAcitvity
);
export default dashboardRoute;
