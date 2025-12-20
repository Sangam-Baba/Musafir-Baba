import {
  register,
  login,
  verifyOtp,
  userUpdatePassword,
  forgotPassword,
  resetPassword,
  me,
  refresh,
  logout,
  getAllUsers,
  changeRole,
  blockUser,
  updateAdmin,
  getAdminById,
} from "../controllers/auth.controller.js";
import { Router } from "express";
import upload from "../middleware/multer.middleware.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";
const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/verifyOtp", verifyOtp);
authRouter.post("/forgotPassword", forgotPassword);
authRouter.post("/refresh", refresh);
authRouter.get("/me", me);

authRouter.patch(
  "/update-password",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin", "superadmin"]),
  userUpdatePassword
);

authRouter.post(
  "/logout",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user"]),
  logout
);
authRouter.patch("/reset-pasword/:token", resetPassword);
authRouter.get(
  "/getAllUsers",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllUsers
);
authRouter.get(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getAdminById
);
authRouter.patch(
  "/changeRole/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  changeRole
);
authRouter.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  blockUser
);
authRouter.patch(
  "/update/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin", "superadmin"]),
  updateAdmin
);
export default authRouter;
