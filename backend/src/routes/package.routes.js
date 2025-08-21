import { createPackage, deletePackage, editPackage, getPackageBySlug, getPackages } from "../controllers/package.controller.js";
import { Router } from "express"
import isAuthenticated  from "../middleware/auth.middleware.js"
import  authorizedRoles   from "../middleware/roleCheck.middleware.js"
const pkgRoute=Router();

pkgRoute.get('/:slug',  getPackageBySlug);
pkgRoute.post('/', isAuthenticated, authorizedRoles(["admin, superadmin"]), createPackage);
pkgRoute.delete('/:id', isAuthenticated, authorizedRoles(["admin, superadmin"]), deletePackage);
pkgRoute.put('/:id', isAuthenticated, authorizedRoles(["admin, superadmin"]), editPackage);
pkgRoute.get('/',getPackages);

export default pkgRoute;