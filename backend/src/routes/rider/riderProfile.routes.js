import { Router } from "express";
import { isRiderAuthenticated } from "../../middleware/riderAuth.middleware.js";
import upload from "../../middleware/multer.middleware.js";
import {
  updatePushToken,
  getMyProfile,
  updateMyProfile,
  uploadProfilePicture,
} from "../../controllers/rider/riderProfile.controller.js";

const router = Router();

router.get("/", isRiderAuthenticated, getMyProfile);
router.patch("/", isRiderAuthenticated, updateMyProfile);
router.post("/picture", isRiderAuthenticated, upload.single("profilePicture"), uploadProfilePicture);
router.patch("/push-token", isRiderAuthenticated, updatePushToken);

export default router;
