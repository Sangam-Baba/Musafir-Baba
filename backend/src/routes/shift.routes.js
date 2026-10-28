import { Router } from "express";
import { getShifts, createShift, updateShift, deleteShift, assignShift } from "../controllers/shift.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

// Mounted at /api/shifts on purpose (not under /api/attendance): roleCheck
// infers the "attendance" permission from /api/attendance URLs, which would
// let staff with that permission through. /api/shifts has no permission
// mapping, so only admin/superadmin roles pass.
const shiftRouter = Router();

shiftRouter.get("/", isAuthenticated, validateSession, authorizedRoles(["admin", "superadmin"]), getShifts);
shiftRouter.post("/", isAuthenticated, validateSession, authorizedRoles(["admin", "superadmin"]), createShift);
shiftRouter.patch("/assign", isAuthenticated, validateSession, authorizedRoles(["admin", "superadmin"]), assignShift);
shiftRouter.patch("/:id", isAuthenticated, validateSession, authorizedRoles(["admin", "superadmin"]), updateShift);
shiftRouter.delete("/:id", isAuthenticated, validateSession, authorizedRoles(["admin", "superadmin"]), deleteShift);

export default shiftRouter;
