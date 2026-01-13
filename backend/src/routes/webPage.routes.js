import {
  createWebPage,
  getWebPage,
  getWebPageBySlug,
  getWebPageById,
  updateWebPage,
  deleteWebPage,
  getRelatedPages,
  getAllParents,
  getRelatedPkgs,
} from "../controllers/webPage.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const webPageRoute = Router();

webPageRoute.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createWebPage
);
webPageRoute.get("/", getWebPage);
webPageRoute.get(
  "/all-parents",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllParents
);
webPageRoute.get("/id/:id", getWebPageById);
webPageRoute.get("/related/:slug", getRelatedPages);
webPageRoute.get("/related-packages/:slug", getRelatedPkgs);
webPageRoute.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateWebPage
);
webPageRoute.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteWebPage
);
webPageRoute.get("/slug", getWebPageBySlug);
export default webPageRoute;
