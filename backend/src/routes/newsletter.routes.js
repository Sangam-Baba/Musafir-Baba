import {
  createNewsletter,
  getAllSubscribers,
  sendNewsletter,
  unsubscribe,
} from "../controllers/newsletter.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";
const newsletterRoutes = Router();

newsletterRoutes.post("/", createNewsletter);
newsletterRoutes.post(
  "/send-newsletter",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  sendNewsletter
);
newsletterRoutes.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllSubscribers
);
newsletterRoutes.patch("/unsubscribe/:email", unsubscribe);

export default newsletterRoutes;
