import { Router } from "express";
import {
  createBatch,
  updateBatch,
  deleteBatch,
  getAllBatch,
  getBatchById,
  getBatchByIds,
} from "../controllers/batch.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const batchRoutes = Router();

batchRoutes.post(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createBatch
);
batchRoutes.get(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getAllBatch
);
batchRoutes.get(
  "/id/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getBatchById
);
batchRoutes.post(
  "/ids",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getBatchByIds
);
batchRoutes.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  updateBatch
);
batchRoutes.delete(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  deleteBatch
);

export default batchRoutes;
