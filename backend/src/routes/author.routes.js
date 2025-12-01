import {
  createAuthor,
  getAuthors,
  deleteAuthor,
  updateAuthor,
  getAuthorBySlug,
  getAuthorById,
} from "../controllers/author.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const authorRoutes = Router();

authorRoutes.get("/", getAuthors);
authorRoutes.get("/:slug", getAuthorBySlug);
authorRoutes.get("/id/:id", getAuthorById);
authorRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createAuthor
);
authorRoutes.put(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateAuthor
);
authorRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteAuthor
);

export default authorRoutes;
