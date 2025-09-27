import { Router } from "express";
import { createItinerary, getItinerary } from "../controllers/itinerary.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const itineraryRoutes = Router();

itineraryRoutes.post('/', createItinerary);
itineraryRoutes.get('/', isAuthenticated, authorizedRoles(["admin", "superadmin"]), getItinerary);


export default itineraryRoutes;