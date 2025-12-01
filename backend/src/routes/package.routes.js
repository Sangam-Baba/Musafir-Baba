import {
  createPackage,
  deletePackage,
  editPackage,
  getPackageBySlug,
  getPackages,
  getAllPackages,
  getPackageById,
  getBestSeller,
  getPackageByCategorySlug,
} from "../controllers/package.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";
// import upload from "../middleware/multer.middleware.js";
const pkgRoute = Router();

pkgRoute.get("/best-seller", getBestSeller);
pkgRoute.get("/all", getAllPackages);
pkgRoute.get("/category/:slug", getPackageByCategorySlug);
pkgRoute.get("/id/:id", getPackageById);
pkgRoute.get("/:slug", getPackageBySlug);
pkgRoute.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createPackage
);
pkgRoute.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deletePackage
);
pkgRoute.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  editPackage
);
pkgRoute.get("/", getPackages);

export default pkgRoute;
