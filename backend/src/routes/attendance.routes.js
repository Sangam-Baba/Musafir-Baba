import { Router } from "express";
import {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getAllAttendance,
  getUserwiseAttendance,
  applyLeave,
  approveLeave,
  markLeave,
  getAllLeaves,
  getMyLeaves,
  getTodayAttendance,
  adminMarkAttendance,
  getMonthlyReport
} from "../controllers/attendance.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const attendanceRouter = Router();

// Staff endpoints for own attendance
attendanceRouter.get(
  "/today",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  getTodayAttendance
);

attendanceRouter.post(
  "/check-in",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  checkIn
);

attendanceRouter.post(
  "/check-out",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  checkOut
);

attendanceRouter.post(
  "/break/start",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  startBreak
);

attendanceRouter.post(
  "/break/end",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  endBreak
);

attendanceRouter.post(
  "/leave/apply",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  applyLeave
);

attendanceRouter.get(
  "/leave/my",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  getMyLeaves
);

// Admin endpoints for all attendance
attendanceRouter.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"], "view-all-attendance"),
  getAllAttendance
);

attendanceRouter.get(
  "/leave",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllLeaves
);

attendanceRouter.get(
  "/userwise",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  getUserwiseAttendance
);

attendanceRouter.post(
  "/leave/approve",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  approveLeave
);

attendanceRouter.post(
  "/leave/mark",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  markLeave
);

attendanceRouter.post(
  "/admin-mark",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  adminMarkAttendance
);

attendanceRouter.get(
  "/monthly-report",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  getMonthlyReport
);

export default attendanceRouter;
