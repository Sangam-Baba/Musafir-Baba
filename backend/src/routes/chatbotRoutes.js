import express from "express";
import { queryChatbot, getHistory, syncKB } from "../controllers/chatbotController.js";

const router = express.Router();

router.post("/query", queryChatbot);
router.get("/history/:sessionId", getHistory);
// Note: In production, /sync should be protected by an Admin middleware
router.post("/sync", syncKB);

export default router;
