import { Router } from "express";
import {
  createMedia,
  getAllMedia,
  getMediaById,
  getMediaUsage,
  refreshMediaUsage,
  updateMedia,
  deleteMedia,
} from "../controllers/media.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const mediaRoutes = Router();

mediaRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  createMedia
);
mediaRoutes.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  getAllMedia
);
mediaRoutes.post(
  "/usage/refresh",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  refreshMediaUsage
);
mediaRoutes.get(
  "/:id/usage",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  getMediaUsage
);
mediaRoutes.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  getMediaById
);
mediaRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  updateMedia
);
mediaRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "staff"]),
  deleteMedia
);
export default mediaRoutes;
