import { Router } from "express";
import {
  createCutomizedBooking,
  updateCustomizedBooking,
  getCustomizedBookings,
  getCustomizedBookingsById,
  deleteCustomizedBooking,
} from "../controllers/customizedBookings.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
const customizedBookingRoutes = Router();

customizedBookingRoutes.post("/", isAuthenticated, createCutomizedBooking);
customizedBookingRoutes.get(
  "/",
  isAuthenticated,
  authorizedRoles(["admin", "superadmin"]),
  getCustomizedBookings
);
customizedBookingRoutes.get("/:id", getCustomizedBookingsById);
customizedBookingRoutes.patch("/:id", updateCustomizedBooking);
customizedBookingRoutes.delete("/:id", deleteCustomizedBooking);

export default customizedBookingRoutes;
