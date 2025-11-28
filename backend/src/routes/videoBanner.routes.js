import { Router } from "express";
import {
  createVideoBanner,
  updateVideoBanner,
  deleteVideoBanner,
  getAllVideoBanner,
  getVideoBannerById,
} from "../controllers/videoBanner.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const videoBannerRoutes = Router();

videoBannerRoutes.post(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createVideoBanner
);
videoBannerRoutes.get("/", getAllVideoBanner);
videoBannerRoutes.get(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getVideoBannerById
);
videoBannerRoutes.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  updateVideoBanner
);
videoBannerRoutes.delete(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  deleteVideoBanner
);
export default videoBannerRoutes;
