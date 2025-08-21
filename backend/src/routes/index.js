import { Router } from "express";
import pkgRoutes from "./package.routes.js"
import authRouter from "./auth.routes.js";
import categoryRoute from "./category.routes.js";
import bookingRoutes from "./booking.routes.js";
const router =Router();

router.use('/packages', pkgRoutes);
router.use('/auth', authRouter);
router.use('/category', categoryRoute);
router.use('/booking',bookingRoutes);


export default router;