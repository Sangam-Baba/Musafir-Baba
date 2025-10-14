import {
  createAboutUs,
  getAboutUs,
  updateAboutUs,
  getAboutUsById,
} from "../controllers/aboutUs.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const aboutUsRoutes = Router();

aboutUsRoutes.post(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createAboutUs
);
aboutUsRoutes.get("/", getAboutUs);
aboutUsRoutes.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  updateAboutUs
);
aboutUsRoutes.get("/:id", getAboutUsById);
export default aboutUsRoutes;
