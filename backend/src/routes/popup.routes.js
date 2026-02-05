import {
  createPopup,
  getAllPopups,
  getPopups,
  updatePopup,
  deletePopup,
  getPopupById,
} from "../controllers/popup.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const popupRoutes = Router();

popupRoutes.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createPopup,
);
popupRoutes.get(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getAllPopups,
);
popupRoutes.get("/page/:page", getPopups);
popupRoutes.get(
  "/id/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  getPopupById,
);
popupRoutes.put(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updatePopup,
);
popupRoutes.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deletePopup,
);

export default popupRoutes;
