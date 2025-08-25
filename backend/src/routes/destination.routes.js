import { createDestination, getAllDestination, getDestinationById, updateDestination, deleteDestination } from "../controllers/destination.controller.js";
import {Router } from "express"
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const destinationRoutes=Router();

destinationRoutes.post('/', isAuthenticated, authorizedRoles(["admin", "superadmin"]), createDestination);
destinationRoutes.get('/', getAllDestination);
destinationRoutes.get('/:id', getDestinationById);
destinationRoutes.put('/:id', isAuthenticated, authorizedRoles(["admin" , "superadmin"]), updateDestination);
destinationRoutes.delete('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), deleteDestination);

export default destinationRoutes;