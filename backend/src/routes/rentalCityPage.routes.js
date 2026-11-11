import { Router } from "express";
import {
  getAllRentalCityPages,
  getRentalCityPageById,
  getRentalCityPageForPair,
  createRentalCityPage,
  updateRentalCityPage,
  deleteRentalCityPage,
} from "../controllers/rentalCityPage.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

// Staff access follows the "master-pickup-destination" permission
// (see ROUTE_PERMISSION_MAP in roleCheck.middleware.js)
const adminOnly = [
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
];

const rentalCityPageRoutes = Router();

// Public (used by /rental/{location}/{type}); registered before "/:id"
rentalCityPageRoutes.get("/lookup", getRentalCityPageForPair);

rentalCityPageRoutes.get("/", ...adminOnly, getAllRentalCityPages);
rentalCityPageRoutes.get("/:id", ...adminOnly, getRentalCityPageById);
rentalCityPageRoutes.post("/", ...adminOnly, createRentalCityPage);
rentalCityPageRoutes.patch("/:id", ...adminOnly, updateRentalCityPage);
rentalCityPageRoutes.delete("/:id", ...adminOnly, deleteRentalCityPage);

export default rentalCityPageRoutes;
