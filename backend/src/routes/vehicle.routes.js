import {
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleById,
  getAllVehicle,
  getVehicleBySlug,
  getAllPublishedVehicle,
  getRelatedVehicle,
  getVehicleFilters,
  duplicateVehicle,
} from "../controllers/vehicle.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const vehicleRoutes = Router();

vehicleRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createVehicle,
);
vehicleRoutes.post(
  "/:id/duplicate",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  duplicateVehicle,
);
vehicleRoutes.get("/", getAllVehicle);
vehicleRoutes.get("/all", getAllPublishedVehicle);
vehicleRoutes.get("/filters", getVehicleFilters);
vehicleRoutes.get("/slug/:slug", getVehicleBySlug);
vehicleRoutes.get("/related/:slug", getRelatedVehicle);
vehicleRoutes.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getVehicleById,
);

vehicleRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateVehicle,
);
vehicleRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteVehicle,
);

export default vehicleRoutes;
