import {Router} from "express";
import { createContact } from "../controllers/contact.controller.js";
import { getAllContact } from "../controllers/contact.controller.js";
import  isAuthenticated  from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const contactRoute=Router();

contactRoute.post('/', createContact);
contactRoute.get('/', isAuthenticated, authorizedRoles(["admin", "superadmin"]), getAllContact);
export default contactRoute;