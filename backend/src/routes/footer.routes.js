import { Router } from "express";
import {
  createFooter,
  getAllFooter,
  getFooterById,
  updateFooterById,
  deleteFooterById,
} from "../controllers/footer.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";
const footerRoutes = Router();

footerRoutes.get("/", getAllFooter);
footerRoutes.get(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getFooterById
);
footerRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createFooter
);
footerRoutes.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateFooterById
);
footerRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteFooterById
);

export default footerRoutes;
