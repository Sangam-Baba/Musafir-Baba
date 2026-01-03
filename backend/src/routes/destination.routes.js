import {
  createDestination,
  getAllDestination,
  getDestinationById,
  updateDestination,
  deleteDestination,
  getOnlyDestination,
  getDestinationByCategoryId,
  getDestinationBySlug,
} from "../controllers/destination.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import upload from "../middleware/multer.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const destinationRoutes = Router();

destinationRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  createDestination
);
destinationRoutes.get("/", getAllDestination);
destinationRoutes.get("/only", getOnlyDestination);
destinationRoutes.get("/slug/:slug", getDestinationBySlug);
destinationRoutes.get("/category/:id", getDestinationByCategoryId);
destinationRoutes.get("/:id", getDestinationById);
destinationRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateDestination
);
destinationRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteDestination
);

export default destinationRoutes;
