import { Router } from "express";
import {
  createDestinationSeo,
  getDestinationSeo,
  getAllDestinationSeo,
  updateDestinationSeo,
  deleteDestinationSeo,
  getDestinationSeoById,
} from "../controllers/destinationSeo.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const destinationSeoRoute = Router();

destinationSeoRoute.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createDestinationSeo
);

destinationSeoRoute.get(
  "/id/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getDestinationSeoById
);

destinationSeoRoute.get("/:category_slug/:destination_slug", getDestinationSeo);

destinationSeoRoute.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllDestinationSeo
);

destinationSeoRoute.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateDestinationSeo
);

destinationSeoRoute.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteDestinationSeo
);

export default destinationSeoRoute;
