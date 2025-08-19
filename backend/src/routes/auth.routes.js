import { register, login, verifyOtp, forgotPassword , resetPassword} from "../controllers/auth.controller.js";
import { Router } from "express";

const authRouter=Router();

authRouter.post('/register',register);
authRouter.post('/login',login);
authRouter.post('/verifyOtp',verifyOtp);
authRouter.post('/forgotPassword', forgotPassword);
authRouter.post("/reset-pasword/:token", resetPassword);

export default authRouter;