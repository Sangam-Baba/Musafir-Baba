import { createPackage, deletePackage, editPackage, getPackageBySlug } from "../controllers/package.controller.js";
import { Router } from "express"
import isAuthenticated  from "../middleware/auth.middleware.js"
import  authorizedRoles   from "../middleware/roleCheck.middleware.js"
const pkgRoute=Router();

pkgRoute.get('/:slug',  getPackageBySlug);
pkgRoute.post('/', isAuthenticated, authorizedRoles("admin"), createPackage);
pkgRoute.delete('/:id', isAuthenticated, authorizedRoles("admin"), deletePackage);
pkgRoute.put('/:id', isAuthenticated, authorizedRoles("admin"), editPackage);
pkgRoute.get('/',)

export default pkgRoute;