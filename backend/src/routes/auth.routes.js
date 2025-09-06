import { register, login, verifyOtp, forgotPassword , resetPassword, refresh , logout} from "../controllers/auth.controller.js";
import { Router } from "express";
import upload from "../middleware/multer.middleware.js";
import isAuthenticated from "../middleware/auth.middleware.js";
const authRouter=Router();

authRouter.post('/register',upload.fields([
    { name:"avatar" , maxCount:1},
]),register);
authRouter.post('/login',login);
authRouter.post('/verifyOtp',verifyOtp);
authRouter.post('/forgotPassword', forgotPassword);
authRouter.post('/refresh' ,refresh);
authRouter.post('/logout', isAuthenticated, logout);
authRouter.patch("/reset-pasword/:token", resetPassword);

export default authRouter;