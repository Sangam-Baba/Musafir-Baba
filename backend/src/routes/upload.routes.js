import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { getSignature } from "./../services/cloudinarySignature.js";

const uploadRoutes = Router();

uploadRoutes.get("/signature", isAuthenticated, authorizedRoles(["admin", "superadmin"]), getSignature);

export default uploadRoutes;