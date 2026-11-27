import { Router } from "express";
import {
  getAllSpecialTypes,
  getSpecialTypeById,
  createSpecialType,
  updateSpecialType,
  deleteSpecialType,
  getAllSpecialPages,
  getSpecialPageById,
  createSpecialPage,
  updateSpecialPage,
  deleteSpecialPage,
  lookupSpecialPage,
} from "../controllers/rentalSpecial.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

// Staff access: special types follow "master-vehicle-type", special pages
// follow "master-pickup-destination" (same as City + Type pages). Passed
// explicitly, so the shared permission map is not changed.
const adminWith = (permission) => [
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"], permission),
];
const typeAdmin = adminWith("master-vehicle-type");
const pageAdmin = adminWith("master-pickup-destination");

const rentalSpecialRoutes = Router();

// Public (used by /rental/{location}/{special-type}[/{slug}])
rentalSpecialRoutes.get("/lookup", lookupSpecialPage);

rentalSpecialRoutes.get("/types", ...typeAdmin, getAllSpecialTypes);
rentalSpecialRoutes.get("/types/:id", ...typeAdmin, getSpecialTypeById);
rentalSpecialRoutes.post("/types", ...typeAdmin, createSpecialType);
rentalSpecialRoutes.patch("/types/:id", ...typeAdmin, updateSpecialType);
rentalSpecialRoutes.delete("/types/:id", ...typeAdmin, deleteSpecialType);

rentalSpecialRoutes.get("/pages", ...pageAdmin, getAllSpecialPages);
rentalSpecialRoutes.get("/pages/:id", ...pageAdmin, getSpecialPageById);
rentalSpecialRoutes.post("/pages", ...pageAdmin, createSpecialPage);
rentalSpecialRoutes.patch("/pages/:id", ...pageAdmin, updateSpecialPage);
rentalSpecialRoutes.delete("/pages/:id", ...pageAdmin, deleteSpecialPage);

export default rentalSpecialRoutes;
