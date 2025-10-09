import {
  createApplication,
  updateApplication,
  getAllApplications,
  deleteApplication,
} from "../controllers/jobApplication.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const jobApplicationRoutes = Router();

jobApplicationRoutes.post("/", createApplication);
jobApplicationRoutes.get(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getAllApplications
);
jobApplicationRoutes.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  updateApplication
);
jobApplicationRoutes.delete(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  deleteApplication
);

export default jobApplicationRoutes;
