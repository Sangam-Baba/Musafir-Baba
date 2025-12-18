import { Router } from "express";
import {
  createBatch,
  updateBatch,
  deleteBatch,
  getAllBatch,
  getBatchById,
  getBatchByIds,
  duplicateBatch,
} from "../controllers/batch.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const batchRoutes = Router();

batchRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createBatch
);
batchRoutes.post(
  "/duplicate/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  duplicateBatch
);
batchRoutes.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllBatch
);
batchRoutes.get(
  "/id/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getBatchById
);
batchRoutes.post(
  "/ids",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getBatchByIds
);
batchRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateBatch
);
batchRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteBatch
);

export default batchRoutes;
