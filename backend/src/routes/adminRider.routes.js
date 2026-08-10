import express from "express";
import {
  getAllRiders,
  getRiderDetail,
  verifyRiderDocument,
  setRiderVerified,
} from "../controllers/adminRider.controller.js";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizedRoles(["admin", "superadmin"]));

router.get("/", getAllRiders);
router.get("/:id", getRiderDetail);
router.put("/:id/document", verifyRiderDocument);
router.put("/:id/verify", setRiderVerified);

export default router;
