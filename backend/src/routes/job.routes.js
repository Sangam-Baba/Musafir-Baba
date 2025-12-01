import {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
} from "../controllers/job.controller.js";

import { Router } from "express";

import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const jobRoute = Router();

jobRoute.post(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createJob
);
jobRoute.get("/", getAllJobs);
jobRoute.get("/:id", getJobById);
jobRoute.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateJob
);
jobRoute.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteJob
);

export default jobRoute;
