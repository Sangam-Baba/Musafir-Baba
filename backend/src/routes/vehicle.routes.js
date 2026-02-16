import {
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleById,
  getAllVehicle,
  getVehicleBySlug,
  getAllPublishedVehicle,
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
vehicleRoutes.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllVehicle,
);
vehicleRoutes.get("/all", getAllPublishedVehicle);
vehicleRoutes.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getVehicleById,
);
vehicleRoutes.get("/slug/:slug", getVehicleBySlug);

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
