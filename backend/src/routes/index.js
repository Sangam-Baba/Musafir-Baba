import { Router } from "express";
import pkgRoutes from "./package.routes.js"
import authRouter from "./auth.routes.js";
import categoryRoute from "./category.routes.js";
import bookingRoutes from "./booking.routes.js";
import destinationRoutes from "./destination.routes.js"
import paymentRoute from "./payment.routes.js";
import blogRoutes from "./blog.routes.js";
const router =Router();

router.use('/packages', pkgRoutes);
router.use('/auth', authRouter);
router.use('/category', categoryRoute);
router.use('/booking',bookingRoutes);
router.use('/destination', destinationRoutes);
router.use('/payment', paymentRoute);
router.use('/blog', blogRoutes);


export default router;