import {
  createCustomizedPackage,
  updateCustomizedPackage,
  getCustomizedPackages,
  getCustomizedPackagesById,
  deleteCustomizedPackage,
} from "../controllers/customizedPackage.controller.js";

import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";
const customizedPackageRoutes = Router();

customizedPackageRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createCustomizedPackage
);
customizedPackageRoutes.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "user"]),
  getCustomizedPackages
);
customizedPackageRoutes.get("/:id", getCustomizedPackagesById);
customizedPackageRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateCustomizedPackage
);
customizedPackageRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteCustomizedPackage
);

export default customizedPackageRoutes;
