import express from "express";
import { getHolidays, addHoliday, removeHoliday } from "../controllers/holiday.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const router = express.Router();

router.get("/", getHolidays);
router.post("/", isAuthenticated, validateSession, authorizedRoles(["admin", "superadmin"]), addHoliday);
router.delete("/:id", isAuthenticated, validateSession, authorizedRoles(["admin", "superadmin"]), removeHoliday);

export default router;
