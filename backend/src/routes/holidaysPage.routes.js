import { Router } from "express";
import {
  getHolidaysPage,
  upsertHolidaysPage,
} from "../controllers/holidaysPage.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const holidaysPageRoute = Router();

holidaysPageRoute.get("/", getHolidaysPage);

holidaysPageRoute.patch(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  upsertHolidaysPage,
);

export default holidaysPageRoute;
