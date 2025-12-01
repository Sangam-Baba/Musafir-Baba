import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import {
  getDashboardSummary,
  getMonthlyBookings,
  getBookingVSVisaEnquiry,
  getLatestAcitvity,
  getCombinedNewsBlog,
} from "../controllers/dashboard.controller.js";
import { validateSession } from "../middleware/session.middleware.js";

const dashboardRoute = Router();

dashboardRoute.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getDashboardSummary
);

dashboardRoute.get(
  "/monthly-bookings",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getMonthlyBookings
);

dashboardRoute.get(
  "/visa-vs-booking",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getBookingVSVisaEnquiry
);

dashboardRoute.get(
  "/latest-activity",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getLatestAcitvity
);

dashboardRoute.get("/combined-news-blog", getCombinedNewsBlog);
export default dashboardRoute;
