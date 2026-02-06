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
} from "../controllers/staff.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";
const staffRouter = Router();

staffRouter.post("/", registerAdmin);

staffRouter.post("/refresh", refresh);

staffRouter.post(
  "/logout",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin"]),
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
  authorizedRoles(["admin"]),
  getAdminById,
);
staffRouter.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin"]),
  getAllAdmin,
);
staffRouter.post("/login", loginAdmin);
staffRouter.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin"]),
  updateAdmin,
);
staffRouter.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin"]),
  deleteAdmin,
);
export default staffRouter;
