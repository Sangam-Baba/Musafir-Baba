import { createOtp, verifyOtp } from "../controllers/otpEnquiry.contoller.js";
import { Router } from "express";

const otpRoutes = Router();

otpRoutes.post("/", createOtp);
otpRoutes.post("/verify-otp", verifyOtp);

export default otpRoutes;
