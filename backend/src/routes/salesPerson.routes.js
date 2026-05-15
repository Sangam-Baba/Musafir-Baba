import { Router } from "express";
import {
  createSalesPerson,
  getSalesPersons,
  getSalesPersonById,
  updateSalesPerson,
  deleteSalesPerson,
} from "../controllers/salesPerson.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { validateSession } from "../middleware/session.middleware.js";

const router = Router();

router.get("/", isAuthenticated, validateSession, getSalesPersons);
router.get("/:id", isAuthenticated, validateSession, getSalesPersonById);
router.post(
  "/",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  createSalesPerson
);
router.patch(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  updateSalesPerson
);
router.delete(
  "/:id",
  isAuthenticated,
  validateSession,
  authorizedRoles(["admin", "superadmin"]),
  deleteSalesPerson
);

export default router;
