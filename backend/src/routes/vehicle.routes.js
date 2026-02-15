import {
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleById,
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
  "/id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getVehicleById,
);
vehicleRoutes.put(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateVehicle,
);
vehicleRoutes.delete(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteVehicle,
);

export default vehicleRoutes;
