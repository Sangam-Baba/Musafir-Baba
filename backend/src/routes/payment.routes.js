import {createPayemnt , verifySuccessPayment, verifyFailurePayment} from "../controllers/payment.controller.js";
import { Router } from "express";
import isAuthenticated from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";

const paymentRoute=Router();

paymentRoute.post('/', isAuthenticated, authorizedRoles(["user", "admin" , "superadmin"]), createPayemnt);
paymentRoute.post('/success', verifySuccessPayment );
paymentRoute.post('/failure', verifyFailurePayment );

export default paymentRoute;