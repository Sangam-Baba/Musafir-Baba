import express from "express";
import { Router } from "express";
import { createComment, getComments } from "../controllers/comment.controller.js";

const commentRoutes= Router();

commentRoutes.post('/', createComment);
commentRoutes.get('/:id', getComments);


export default commentRoutes;