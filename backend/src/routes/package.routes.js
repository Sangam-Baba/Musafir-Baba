import { createPackage, deletePackage, editPackage, getPackageBySlug, getPackages , getAllPackages, getPackageById } from "../controllers/package.controller.js";
import { Router } from "express"
import isAuthenticated  from "../middleware/auth.middleware.js"
import  authorizedRoles   from "../middleware/roleCheck.middleware.js"
// import upload from "../middleware/multer.middleware.js";
const pkgRoute=Router();

pkgRoute.get('/all',getAllPackages)
pkgRoute.get('/id/:id',  getPackageById);
pkgRoute.get('/:slug',  getPackageBySlug);
pkgRoute.post('/', isAuthenticated, authorizedRoles(["admin", "superadmin"]),createPackage);
pkgRoute.delete('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), deletePackage);
pkgRoute.patch('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), editPackage);
pkgRoute.get('/',getPackages)


export default pkgRoute;