import {
  getCategoryBySlug,
  getCategory,
  updateCategory,
  deleteCategory,
  createCategory,
  getCategoryById,
} from "../controllers/category.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import upload from "../middleware/multer.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const categoryRoute = Router();

categoryRoute.get("/id/:id", getCategoryById);
categoryRoute.get("/:slug", getCategoryBySlug);

categoryRoute.get("/", getCategory);

categoryRoute.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createCategory
);

categoryRoute.patch(
  "/:slug",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateCategory
);

categoryRoute.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteCategory
);

export default categoryRoute;
