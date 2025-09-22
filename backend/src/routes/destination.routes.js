import { createDestination, getAllDestination, getDestinationById, updateDestination, deleteDestination } from "../controllers/destination.controller.js";
import {Router } from "express"
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import upload from "../middleware/multer.middleware.js"

const destinationRoutes=Router();

destinationRoutes.post('/', isAuthenticated, authorizedRoles(["admin", "superadmin"]),  upload.fields([
    {name:"coverImage", maxCount:1},
    {name:"gallery", maxCount:10},
]), createDestination);
destinationRoutes.get('/', getAllDestination);
destinationRoutes.get('/:id', getDestinationById);
destinationRoutes.patch('/:id', isAuthenticated, authorizedRoles(["admin" , "superadmin"]), updateDestination);
destinationRoutes.delete('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), deleteDestination);

export default destinationRoutes;