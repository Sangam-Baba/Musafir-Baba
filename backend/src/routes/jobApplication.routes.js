import {
  createApplication,
  updateApplication,
  getAllApplications,
  deleteApplication,
} from "../controllers/jobApplication.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const jobApplicationRoutes = Router();

jobApplicationRoutes.post("/", createApplication);
jobApplicationRoutes.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllApplications
);
jobApplicationRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateApplication
);
jobApplicationRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteApplication
);

export default jobApplicationRoutes;
