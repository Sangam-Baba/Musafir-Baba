import { Router } from "express";
import {
  createDocument,
  updateDocument,
  getMyAllDocuments,
  getDocumentById,
} from "../controllers/document.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const documentRoutes = Router();

documentRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin", "superadmin"]),
  createDocument
);

documentRoutes.get(
  "/my",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user"]),
  getMyAllDocuments
);

documentRoutes.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin", "superadmin"]),
  getDocumentById
);

documentRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["user", "admin", "superadmin"]),
  updateDocument
);

export default documentRoutes;
