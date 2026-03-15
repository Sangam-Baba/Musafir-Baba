import { Router } from "express";
import { migrateLocations } from "../controllers/migration.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const migrationRoutes = Router();

migrationRoutes.get(
  "/migrate-locations",
  isAuthenticated,
  authorizedRoles(["superadmin", "admin"]),
  migrateLocations
);

export default migrationRoutes;
