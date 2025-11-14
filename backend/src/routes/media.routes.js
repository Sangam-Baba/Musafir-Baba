import { Router } from "express";
import { createMedia, getAllMedia } from "../controllers/media.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const mediaRoutes = Router();

mediaRoutes.post(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createMedia
);
mediaRoutes.get(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getAllMedia
);
export default mediaRoutes;
