import {
  createWebPage,
  getWebPage,
  getWebPageBySlug,
  getWebPageById,
  updateWebPage,
  deleteWebPage,
  getRelatedPages,
} from "../controllers/webPage.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const webPageRoute = Router();

webPageRoute.post(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  createWebPage
);
webPageRoute.get(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getWebPage
);
webPageRoute.get("/:slug", getWebPageBySlug);
webPageRoute.get("/id/:id", getWebPageById);
webPageRoute.get("/related/:slug", getRelatedPages);
webPageRoute.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  updateWebPage
);
webPageRoute.delete(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  deleteWebPage
);

export default webPageRoute;
