import { Router } from "express";
import {
  createCoupan,
  updateCoupan,
  getAllCoupan,
  getCoupanById,
} from "../controllers/coupan.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const coupanRoutes = Router();

coupanRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createCoupan
);

coupanRoutes.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin", "superadmin"]),
  getAllCoupan
);

coupanRoutes.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getCoupanById
);
coupanRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateCoupan
);
export default coupanRoutes;
