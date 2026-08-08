import {
  createPayemnt,
  verifySuccessPayment,
  verifyFailurePayment,
  verifyMembershipSuccessPayment,
  verifyMembershipFailurePayment,
  verifyCustomizedFailurePayment,
  verifyCustomizedSuccessPayment,
  verifyCustomizedTourSuccessPayment,
  verifyCustomizedTourFailurePayment,
  verifyVehicleSuccessPayment,
  verifyVehicleFailurePayment,
  verifyVisaSuccessPayment,
  verifyVisaFailurePayment,
  verifyRideSuccessPayment,
  verifyRideFailurePayment,
  createRidePayment,
} from "../controllers/payment.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import { isRiderAuthenticated } from "../middleware/riderAuth.middleware.js";

const paymentRoute = Router();

paymentRoute.post(
  "/",
  isAuthenticated,
  authorizedRoles(["user", "admin", "superadmin"]),
  createPayemnt,
);
paymentRoute.post("/success", verifySuccessPayment);
paymentRoute.post("/failure", verifyFailurePayment);
paymentRoute.post("/success-membership", verifyMembershipSuccessPayment);
paymentRoute.post("/failure-membership", verifyMembershipFailurePayment);
paymentRoute.post("/success-customized", verifyCustomizedSuccessPayment);
paymentRoute.post("/failure-customized", verifyCustomizedFailurePayment);
paymentRoute.post(
  "/success-customized-tour",
  verifyCustomizedTourSuccessPayment,
);
paymentRoute.post(
  "/failure-customized-tour",
  verifyCustomizedTourFailurePayment,
);

paymentRoute.post("/success-vehicle", verifyVehicleSuccessPayment);
paymentRoute.post("/failure-vehicle", verifyVehicleFailurePayment);

paymentRoute.post("/success-visa", verifyVisaSuccessPayment);
paymentRoute.post("/failure-visa", verifyVisaFailurePayment);

paymentRoute.post("/success-ride", verifyRideSuccessPayment);
paymentRoute.post("/failure-ride", verifyRideFailurePayment);
paymentRoute.post("/ride", isRiderAuthenticated, createRidePayment);

export default paymentRoute;

