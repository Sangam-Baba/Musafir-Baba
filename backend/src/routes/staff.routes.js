import { Router } from "express";
import {
  registerAdmin,
  updateAdmin,
  getAdminById,
  loginAdmin,
  logout,
  getAllAdmin,
  deleteAdmin,
  refresh,
  me,
  previewToken,
  adminUpdatePassword,
  adjustLeaveBalance,
} from "../controllers/staff.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";
const staffRouter = Router();

staffRouter.post("/", registerAdmin);

staffRouter.post("/refresh", refresh);

staffRouter.patch(
  "/update-password",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  adminUpdatePassword,
);

staffRouter.post(
  "/logout",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  logout,
);

staffRouter.get("/me", me);
staffRouter.get(
  "/preview-token",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  previewToken,
);
staffRouter.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  getAdminById,
);
staffRouter.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"], ["role", "view-all-attendance"]),
  getAllAdmin,
);
staffRouter.post("/login", loginAdmin);
staffRouter.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  updateAdmin,
);
staffRouter.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteAdmin,
);
staffRouter.patch(
  "/:id/leave-balance",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  adjustLeaveBalance
);

export default staffRouter;
