import { Router } from "express";
import {
  getApplicationById,
  saveDraftApplication,
  submitApplication,
} from "../controllers/visaApplication.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";

const visaApplicationRoutes = Router();

// Get application by ID (public/guest allowed to fetch their draft if they have the ID)
visaApplicationRoutes.get("/:id", getApplicationById);

// Create new draft application
visaApplicationRoutes.post("/", saveDraftApplication);

// Update existing draft application
visaApplicationRoutes.put("/:id", saveDraftApplication);

// Submit application (requires authentication)
visaApplicationRoutes.post("/submit/:id", isAuthenticated, submitApplication);

export default visaApplicationRoutes;
