import { Router } from "express";
import { isRiderAuthenticated } from "../../middleware/riderAuth.middleware.js";
import { getNotifications, markNotificationsRead, getRealtimeToken } from "../../controllers/rider/riderNotification.controller.js";

const router = Router();

router.get("/", isRiderAuthenticated, getNotifications);
router.patch("/mark-read", isRiderAuthenticated, markNotificationsRead);
router.get("/realtime-token", isRiderAuthenticated, getRealtimeToken);

export default router;
