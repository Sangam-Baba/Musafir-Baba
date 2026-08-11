import { Router } from "express";
import { isRiderAuthenticated } from "../../middleware/riderAuth.middleware.js";
import { getNotifications, markNotificationsRead } from "../../controllers/rider/riderNotification.controller.js";

const router = Router();

router.get("/", isRiderAuthenticated, getNotifications);
router.patch("/mark-read", isRiderAuthenticated, markNotificationsRead);

export default router;
