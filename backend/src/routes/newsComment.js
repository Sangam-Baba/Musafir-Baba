import express from "express";
import { Router } from "express";
import { createComment, getComments } from "../controllers/newsComment.controller.js";

const newsCommentRoutes= Router();

newsCommentRoutes.post('/', createComment);
newsCommentRoutes.get('/:id', getComments);


export default newsCommentRoutes;