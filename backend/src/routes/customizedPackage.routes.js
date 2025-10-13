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
const customizedPackageRoutes = Router();

customizedPackageRoutes.post(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createCustomizedPackage
);
customizedPackageRoutes.get(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getCustomizedPackages
);
customizedPackageRoutes.get("/:id", getCustomizedPackagesById);
customizedPackageRoutes.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  updateCustomizedPackage
);
customizedPackageRoutes.delete(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  deleteCustomizedPackage
);

export default customizedPackageRoutes;
