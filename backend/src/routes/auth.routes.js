import {
  register,
  registerAdmin,
  login,
  verifyOtp,
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
const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/register-admin", registerAdmin);
authRouter.post("/login", login);
authRouter.post("/verifyOtp", verifyOtp);
authRouter.post("/forgotPassword", forgotPassword);
authRouter.post("/refresh", refresh);
authRouter.get("/me", me);
authRouter.get(
  "/admin/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getAdminById
);
authRouter.post("/logout", isAuthenticated, logout);
authRouter.patch("/reset-pasword/:token", resetPassword);
authRouter.get(
  "/getAllUsers",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getAllUsers
);
authRouter.patch(
  "/changeRole/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  changeRole
);
authRouter.patch(
  "/blockUser/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  blockUser
);
authRouter.patch(
  "/update-admin/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  updateAdmin
);
export default authRouter;
