import { Router } from "express";
import {
  getApplicationById,
  saveDraftApplication,
  submitApplication,
  getAllApplications,
  updateApplicationStatus,
  getUserVisaApplications,
} from "../controllers/visaApplication.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const visaApplicationRoutes = Router();

// Fetch all applications (Admin/Staff only) - MUST be above /:id
visaApplicationRoutes.get(
  "/all",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin", "staff"]),
  getAllApplications
);
// Fetch current user's applications
visaApplicationRoutes.get("/my", isAuthenticated, getUserVisaApplications);

// Get application by ID (public/guest allowed to fetch their draft if they have the ID)
visaApplicationRoutes.get("/:id", getApplicationById);

// Create new draft application
visaApplicationRoutes.post("/", saveDraftApplication);

// Update existing draft application
visaApplicationRoutes.put("/:id", saveDraftApplication);

// Update application status (Admin/Staff only)
visaApplicationRoutes.patch(
  "/status/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin", "staff"]),
  updateApplicationStatus
);

// Submit application (requires authentication)
visaApplicationRoutes.post("/submit/:id", isAuthenticated, submitApplication);

export default visaApplicationRoutes;
