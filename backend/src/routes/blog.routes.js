import { createBlog, updateBlog, deleteBlog, getAllBlog,getBlogBySlug, blogComment, blogView, trandingBlogs , blogLike } from "../controllers/bolg.controller.js";
import {Router} from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import upload from "../middleware/multer.middleware.js";
const blogRoutes=Router();

// blogRoutes.post('/comment/:id', blogComment);
blogRoutes.patch('/view/:id', blogView);
blogRoutes.patch('/like/:id', blogLike);
blogRoutes.post('/', isAuthenticated, authorizedRoles(["admin", "superadmin"]),  createBlog);
blogRoutes.patch('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), updateBlog);
blogRoutes.delete('/:id',isAuthenticated, authorizedRoles(["admin", "superadmin"]), deleteBlog);

blogRoutes.get('/tranding', trandingBlogs);
blogRoutes.get('/:slug', getBlogBySlug);
blogRoutes.get('/', getAllBlog);

export default blogRoutes;