import { 
  getCategoryBySlug, 
 getCategory, 
  updateCategory, 
  deleteCategory, 
  createCategory 
} from "../controllers/category.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const categoryRoute = Router();

categoryRoute.get('/:slug', getCategoryBySlug);

categoryRoute.get(
  '/', 
  isAuthenticated, 
  authorizedRoles(["admin, superadmin"]), 
  getCategory
);

categoryRoute.post(
  '/', 
  isAuthenticated, 
  authorizedRoles(["admin,superadmin"]), 
  createCategory
);

categoryRoute.put(
  '/:id', 
  isAuthenticated, 
  authorizedRoles(["admin","superadmin"]), 
  updateCategory
);

categoryRoute.patch(
  '/:id', 
  isAuthenticated, 
  authorizedRoles(["admin", "superadmin"]), 
  deleteCategory
);

export default categoryRoute;
