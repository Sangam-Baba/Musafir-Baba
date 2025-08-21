import { createBooking, getAllBookings, getBookingById, cancelMyBooking, getMyBookings, adminUpdateBookingStatus } from "../controllers/booking.controller.js";
import {Router} from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
const bookingRoutes=Router();

bookingRoutes.post('/', isAuthenticated, authorizedRoles(["user", "admin"]), createBooking);
bookingRoutes.get('/admin', isAuthenticated, authorizedRoles(["admin", "superadmin"]), getAllBookings);
bookingRoutes.get('/:id', isAuthenticated,authorizedRoles(["admin", "superadmin"]), getBookingById);
bookingRoutes.patch('/cancel/:id', isAuthenticated, authorizedRoles(["user", "admin"]), cancelMyBooking);
bookingRoutes.get('/', isAuthenticated, authorizedRoles(["user", "admin"]), getMyBookings);
bookingRoutes.patch('/status/:id', isAuthenticated, authorizedRoles(["admin", "superadmin"]), adminUpdateBookingStatus);

export default bookingRoutes;