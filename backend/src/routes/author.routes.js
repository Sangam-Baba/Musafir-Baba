import { createAuthor , getAuthors , deleteAuthor , updateAuthor } from "../controllers/author.controller";
import express from "express";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";


const authorRoutes=Router();


authorRoutes.get('/', isAuthenticated, authorizedRoles(["admin", "superadmin"]), getAuthors);
authorRoutes.post('/', isAuthenticated, authorizedRoles(["admin", "superadmin"]), createAuthor);
authorRoutes.put('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), updateAuthor);
authorRoutes.delete('/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), deleteAuthor);

export default authorRoutes;