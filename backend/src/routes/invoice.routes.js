import { Router } from "express";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  sendInvoiceEmail,
  approveInvoice,
  logInvoiceDownload,
} from "../controllers/invoice.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const router = Router();

// Protect all routes with isAuthenticated middleware
router.use(isAuthenticated);

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);
router.post("/:id/send-email", sendInvoiceEmail);
router.post("/:id/log-download", logInvoiceDownload);
router.patch("/:id/approve", authorizedRoles(["admin", "superadmin"]), approveInvoice);

export default router;
