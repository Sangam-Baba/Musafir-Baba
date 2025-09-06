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
import upload from "../middleware/multer.middleware.js";

const categoryRoute = Router();

categoryRoute.get('/:slug', getCategoryBySlug);

categoryRoute.get(
  '/',  
  getCategory
);

categoryRoute.post(
  '/', 
  isAuthenticated, 
  authorizedRoles(["admin","superadmin"]),
  upload.fields([
    {name:"Image", maxCount:1},
  ]),
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
