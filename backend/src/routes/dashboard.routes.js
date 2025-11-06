import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import {
  getDashboardSummary,
  getMonthlyBookings,
  getBookingVSVisaEnquiry,
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
export default dashboardRoute;
