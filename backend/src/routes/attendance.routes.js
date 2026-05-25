import { Router } from "express";
import {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getTodayAttendance,
  getAllAttendance,
  getUserwiseAttendance,
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

// Admin endpoints for all attendance
attendanceRouter.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllAttendance
);

attendanceRouter.get(
  "/userwise",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getUserwiseAttendance
);

export default attendanceRouter;
