import { Router } from "express";
import { createFooter , getAllFooter, getFooterById, updateFooterById, deleteFooterById    } from "../controllers/footer.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
const footerRoutes= Router();

footerRoutes.get('/',  isAuthenticated, authorizedRoles(["admin", "superadmin"]), getAllFooter);
footerRoutes.get('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), getFooterById);
footerRoutes.post('/', isAuthenticated, authorizedRoles(["admin", "superadmin"]), createFooter);
footerRoutes.patch('/:id',isAuthenticated, authorizedRoles(["admin", "superadmin"]), updateFooterById);
footerRoutes.delete('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), deleteFooterById);

export default footerRoutes;