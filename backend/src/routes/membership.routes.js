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

const membershipRoutes = Router();

membershipRoutes.post(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createMembership
);
membershipRoutes.get(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getAllMembership
);
membershipRoutes.get(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getMembershipById
);
membershipRoutes.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  updateMembership
);
membershipRoutes.delete(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  deleteMembership
);

export default membershipRoutes;
