import express from "express";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  createRecord,
  getRecords,
  getRecordById,
  updateStatus,
  addComment,
  getComments,
} from "../controllers/salesRecord.controller.js";

const router = express.Router();

// All routes require authentication and the "sales-record" permission
router.use(authMiddleware);
router.use(authorizedRoles(["admin", "superadmin", "staff"], "sales-record"));

// Records
router.post("/", createRecord);
router.get("/", getRecords);
router.get("/:id", getRecordById);
router.put("/:id/status", updateStatus); // Only admin/superadmin logic inside controller

// Comments
router.post("/:id/comments", addComment);
router.get("/:id/comments", getComments);

export default router;
