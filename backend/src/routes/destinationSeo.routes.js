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

const destinationSeoRoute = Router();

destinationSeoRoute.post(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createDestinationSeo
);

destinationSeoRoute.get(
  "/id/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getDestinationSeoById
);

destinationSeoRoute.get("/:destination_slug/:category_slug", getDestinationSeo);

destinationSeoRoute.get(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getAllDestinationSeo
);

destinationSeoRoute.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  updateDestinationSeo
);

destinationSeoRoute.delete(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  deleteDestinationSeo
);

export default destinationSeoRoute;
