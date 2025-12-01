import { Router } from "express";
import {
  createReviews,
  updateReviews,
  deleteReviews,
  getReviewById,
  getReviewsByIds,
} from "../controllers/review.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const reviewRoutes = Router();

reviewRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin", "superadmin"]),
  createReviews
);
reviewRoutes.post(
  "/ids",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getReviewsByIds
);
reviewRoutes.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getReviewById
);
reviewRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateReviews
);
reviewRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteReviews
);
export default reviewRoutes;
