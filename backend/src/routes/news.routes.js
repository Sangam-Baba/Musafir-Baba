import {
  createNews,
  updateNews,
  deleteNews,
  getAllNews,
  getNewsBySlug,
  getNewsById,
  NewsView,
  trandingNews,
  NewsLike,
} from "../controllers/news.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";
const newsRoutes = Router();

// blogRoutes.post('/comment/:id', blogComment);
newsRoutes.patch("/view/:id", NewsView);
newsRoutes.patch("/like/:id", NewsLike);
newsRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createNews,
);
newsRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateNews,
);
newsRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteNews,
);

newsRoutes.get("/tranding", trandingNews);
newsRoutes.get(
  "/id/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getNewsById,
);
newsRoutes.get("/:slug", getNewsBySlug);
newsRoutes.get("/", getAllNews);

export default newsRoutes;
