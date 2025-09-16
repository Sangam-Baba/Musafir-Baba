import { Router } from "express";
import pkgRoutes from "./package.routes.js"
import authRouter from "./auth.routes.js";
import categoryRoute from "./category.routes.js";
import bookingRoutes from "./booking.routes.js";
import destinationRoutes from "./destination.routes.js"
import paymentRoute from "./payment.routes.js";
import blogRoutes from "./blog.routes.js";
import uploadRoutes from "./upload.routes.js";
import authorRoutes from "./author.routes.js";
const router =Router();

router.use('/packages', pkgRoutes);
router.use('/auth', authRouter);
router.use('/category', categoryRoute);
router.use('/booking',bookingRoutes);
router.use('/destination', destinationRoutes);
router.use('/payment', paymentRoute);
router.use('/blogs', blogRoutes);
router.use('/upload', uploadRoutes);
router.use('/authors', authorRoutes);
export default router;