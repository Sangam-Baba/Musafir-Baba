import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { getSignature } from "./../services/cloudinarySignature.js";
import { getPresignedUploadUrl } from "../services/cloudflareSignature.js";

const uploadRoutes = Router();

uploadRoutes.post(
  "/cloudflare-url",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin", "user"]),
  getPresignedUploadUrl
);

uploadRoutes.get(
  "/signature",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin", "user"]),
  getSignature
);

export default uploadRoutes;
