import { Router } from "express";
import { isRiderAuthenticated } from "../../middleware/riderAuth.middleware.js";
import upload from "../../middleware/multer.middleware.js";
import { getMyDocument, uploadMyDocument } from "../../controllers/rider/riderDocument.controller.js";

const router = Router();

router.get("/", isRiderAuthenticated, getMyDocument);
router.post(
  "/",
  isRiderAuthenticated,
  upload.fields([{ name: "front", maxCount: 1 }, { name: "back", maxCount: 1 }]),
  uploadMyDocument
);

export default router;
