import {
  createNewsletter,
  getAllSubscribers,
  sendNewsletter,
  unsubscribe,
  previewNewsletter,
} from "../controllers/newsletter.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";
const newsletterRoutes = Router();

newsletterRoutes.post("/", createNewsletter);
newsletterRoutes.post(
  "/send-newsletter/:type",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "user"]),
  sendNewsletter
);
newsletterRoutes.get(
  "/get-preview/:type",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin", "user"]),
  previewNewsletter
);
newsletterRoutes.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllSubscribers
);
newsletterRoutes.patch("/unsubscribe", unsubscribe);

export default newsletterRoutes;
