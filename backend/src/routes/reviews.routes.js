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

const reviewRoutes = Router();

reviewRoutes.post(
  "/",
  isAuthenticated,
  authorizedRoles(["user", "admin", "superadmin"]),
  createReviews
);
reviewRoutes.post(
  "/ids",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getReviewsByIds
);
reviewRoutes.get(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getReviewById
);
reviewRoutes.patch(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  updateReviews
);
reviewRoutes.delete(
  "/:id",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  deleteReviews
);
export default reviewRoutes;
