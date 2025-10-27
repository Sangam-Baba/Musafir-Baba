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
} from "../controllers/payment.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const paymentRoute = Router();

paymentRoute.post(
  "/",
  isAuthenticated,
  authorizedRoles(["user", "admin", "superadmin"]),
  createPayemnt
);
paymentRoute.post("/success", verifySuccessPayment);
paymentRoute.post("/failure", verifyFailurePayment);
paymentRoute.post("/success-membership", verifyMembershipSuccessPayment);
paymentRoute.post("/failure-membership", verifyMembershipFailurePayment);
paymentRoute.post("/success-customized", verifyCustomizedSuccessPayment);
paymentRoute.post("/failure-customized", verifyCustomizedFailurePayment);
paymentRoute.post(
  "/success-customized-tour",
  verifyCustomizedTourSuccessPayment
);
paymentRoute.post(
  "/failure-customized-tour",
  verifyCustomizedTourFailurePayment
);
export default paymentRoute;
