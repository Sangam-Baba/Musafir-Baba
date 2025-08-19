import { Router } from "express";
import pkgRoutes from "./package.routes.js"
import authRouter from "./auth.routes.js";

const router =Router();

router.use('/packages', pkgRoutes);
router.use('/auth', authRouter);


export default router;