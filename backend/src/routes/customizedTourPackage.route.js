import { Router } from "express";
import {
  createCustomizedTourPackage,
  getAllCustomizedTourPackages,
  getCustomizedTourPackageById,
  updateCustomizedTourPackage,
  deleteCustomizedTourPackage,
  getCustomizedTourPackageBySlug,
} from "../controllers/customizedTourPackage.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const customizedTourPackageRoute = Router();

customizedTourPackageRoute.post(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createCustomizedTourPackage
);
customizedTourPackageRoute.get("/", getAllCustomizedTourPackages);
customizedTourPackageRoute.get("/slug/:slug", getCustomizedTourPackageBySlug);
customizedTourPackageRoute.get("/:id", getCustomizedTourPackageById);
customizedTourPackageRoute.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  updateCustomizedTourPackage
);
customizedTourPackageRoute.delete(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  deleteCustomizedTourPackage
);

export default customizedTourPackageRoute;
