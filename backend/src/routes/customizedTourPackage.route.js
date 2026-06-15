import { Router } from "express";
import {
  createCustomizedTourPackage,
  getAllCustomizedTourPackages,
  getCustomizedTourPackageById,
  updateCustomizedTourPackage,
  deleteCustomizedTourPackage,
  getCustomizedTourPackageBySlug,
  getRelatedTour,
  approveCustomizedTourUpdates,
  rejectCustomizedTourUpdates,
} from "../controllers/customizedTourPackage.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const customizedTourPackageRoute = Router();

customizedTourPackageRoute.post(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createCustomizedTourPackage
);
customizedTourPackageRoute.get("/", getAllCustomizedTourPackages);
customizedTourPackageRoute.get("/slug/:slug", getCustomizedTourPackageBySlug);
customizedTourPackageRoute.get("/related/:slug", getRelatedTour);
customizedTourPackageRoute.get("/:id", getCustomizedTourPackageById);
customizedTourPackageRoute.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateCustomizedTourPackage
);
customizedTourPackageRoute.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteCustomizedTourPackage
);
customizedTourPackageRoute.patch(
  "/:id/approve",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  approveCustomizedTourUpdates
);
customizedTourPackageRoute.patch(
  "/:id/reject",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  rejectCustomizedTourUpdates
);

export default customizedTourPackageRoute;
