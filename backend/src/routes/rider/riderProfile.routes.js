import { Router } from "express";
import { isRiderAuthenticated } from "../../middleware/riderAuth.middleware.js";
import { updatePushToken } from "../../controllers/rider/riderProfile.controller.js";

const router = Router();

router.patch("/push-token", isRiderAuthenticated, updatePushToken);

export default router;
