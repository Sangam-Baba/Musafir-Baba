import { createVisa, getAllVisa, updateVisa, deleteVisa , getVisaById } from "../controllers/visa.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const visaRoutes = Router();

visaRoutes.post('/', isAuthenticated, authorizedRoles(["admin", "superadmin"]), createVisa);
visaRoutes.get('/', getAllVisa);
visaRoutes.patch('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), updateVisa);
visaRoutes.delete('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), deleteVisa);
visaRoutes.get('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), getVisaById);

export default visaRoutes;