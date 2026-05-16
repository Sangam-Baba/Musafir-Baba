import { Router } from "express";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  sendInvoiceEmail,
} from "../controllers/invoice.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";

const router = Router();

// Protect all routes with isAuthenticated middleware
router.use(isAuthenticated);

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);
router.post("/:id/send-email", sendInvoiceEmail);

export default router;
