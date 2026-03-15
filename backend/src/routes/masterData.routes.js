import { Router } from "express";
import { brandController, typeController, destinationController } from "../controllers/masterData.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const masterDataRoutes = Router();

const applyRoutes = (path, controller) => {
  masterDataRoutes.post(
    path,
    isAuthenticated,
    validateSession,
    authorizedRoles(["admin", "superadmin"]),
    controller.create
  );
  
  // Publicly accessible for frontend fetching (or require auth if you prefer, but usually frontends need this list for dropdowns if available publicly, though here we will use it for admin and public)
  masterDataRoutes.get(path, controller.getAll);
  
  masterDataRoutes.patch(
    `${path}/:id`,
    isAuthenticated,
    validateSession,
    authorizedRoles(["admin", "superadmin"]),
    controller.update
  );
  masterDataRoutes.delete(
    `${path}/:id`,
    isAuthenticated,
    validateSession,
    authorizedRoles(["admin", "superadmin"]),
    controller.delete
  );
};

applyRoutes("/brand", brandController);
applyRoutes("/type", typeController);
applyRoutes("/pickup-destination", destinationController);

export default masterDataRoutes;
