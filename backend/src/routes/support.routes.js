import { Router } from "express";
import { isRiderAuthenticated } from "../middleware/riderAuth.middleware.js";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import {
  getCatalog,
  getMyBookingsForSupport,
  createTicket,
  getMyTickets,
  getMyTicket,
  riderReply,
  adminListTickets,
  adminGetTicket,
  adminUpdateTicket,
  adminReply,
} from "../controllers/support.controller.js";

// Help & Support for MBGo riders (mounted at /support).
const router = Router();
router.get("/catalog", getCatalog);
router.use(isRiderAuthenticated);
router.get("/bookings", getMyBookingsForSupport);
router.post("/tickets", createTicket);
router.get("/tickets", getMyTickets);
router.get("/tickets/:id", getMyTicket);
router.post("/tickets/:id/messages", riderReply);
export default router;

// Admin (mounted at /admin/support-tickets). Explicit permission so staff
// don't inherit access via roleCheck's URL inference.
export const adminSupportRoutes = Router();
adminSupportRoutes.use(protect);
adminSupportRoutes.use(authorizedRoles(["admin", "superadmin"], "support-tickets"));
adminSupportRoutes.get("/", adminListTickets);
adminSupportRoutes.get("/:id", adminGetTicket);
adminSupportRoutes.patch("/:id", adminUpdateTicket);
adminSupportRoutes.post("/:id/messages", adminReply);
