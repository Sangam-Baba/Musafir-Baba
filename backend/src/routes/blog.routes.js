import { createBlog, updateBlog, deleteBlog, getAllBlog,getBlogBySlug } from "../controllers/bolg.controller.js";
import {Router} from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
const blogRoutes=Router();

blogRoutes.post('/', isAuthenticated, authorizedRoles(["admin", "superadmin"]), createBlog);
blogRoutes.put('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), updateBlog);
blogRoutes.delete('/:id',isAuthenticated, authorizedRoles(["admin", "superadmin"]), deleteBlog);

blogRoutes.get('/:slug', getBlogBySlug);
blogRoutes.get('/', getAllBlog);

export default blogRoutes;