import {
  createVisa,
  getAllVisa,
  updateVisa,
  deleteVisa,
  getVisaById,
  getVisaBySlug,
  getRelatedPages,
} from "../controllers/visa.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const visaRoutes = Router();

visaRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createVisa
);
visaRoutes.get("/", getAllVisa);
visaRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateVisa
);
visaRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteVisa
);
visaRoutes.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getVisaById
);
visaRoutes.get("/slug/:slug", getVisaBySlug);
visaRoutes.get("/related/:slug", getRelatedPages);

export default visaRoutes;
