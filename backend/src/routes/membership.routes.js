import {
  createMembership,
  getAllMembership,
  updateMembership,
  deleteMembership,
  getMembershipById,
} from "../controllers/membership.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const membershipRoutes = Router();

membershipRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createMembership
);
membershipRoutes.get("/", getAllMembership);
membershipRoutes.get("/:id", getMembershipById);
membershipRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateMembership
);
membershipRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteMembership
);

export default membershipRoutes;
