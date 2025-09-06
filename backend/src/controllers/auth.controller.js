import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import sendEmail from "../services/email.service.js";
import generateCryptoToken from "../utils/generateCryptoToken.js"
import { uploadToCloudinary } from "../services/fileUpload.service.js";
import crypto from "crypto";
import {signAccessToken, signRefreshToken, verifyAccess, verifyRefresh } from "../utils/tokens.js";

function issueTokens(userId, role) {
  const accessToken = signAccessToken({ sub: userId , role });
  const refreshToken = signRefreshToken({ sub: userId , role });
  return { accessToken, refreshToken };
}
const register=async(req, res)=>{
    const {name, email, password}=req.body;
    try {
        const isExist=await User.findOne({email});
        if(isExist){
            return res.status(409).json({success:false, message:"User Already exist"})
        }
        let avatar=null;
        if(req.files?.avatar){
            const result=await uploadToCloudinary(req.files.avatar[0].buffer, "avatars");
            avatar=result.secure_url;
        }

       const hashedpassword=await bcrypt.hash(password, 10);

        const { token, hashedToken }=generateCryptoToken();

        const user=new User({name, email, password:hashedpassword ,avatar, otp:hashedToken, otpExpire:Date.now() + 10*60*1000});
        

        const subject="Verify your Musafir-Baba account";
        const emailBody=`Hi! ${name}, Click this link to verify your account: ${process.env.FRONTEND_URL}/auth/verifyotp?email=${email}&otp=${token}. Your OTP is: ${token}`
       const emailResponse= await sendEmail(email, subject,emailBody);

          if (!emailResponse || emailResponse.error!==null) {
          console.error("Email sending failed:", emailResponse.error);
           return res.status(500).json({ success: false, message: "Could not send verification email" });
          }
        
        await user.save();
        return res.status(201).json({success:true, message:"User Registerrd Successfully, Please verify email with OTP sent."});
    } catch (error) {
        console.log("Registration failed", error.message);
       return res.status(500).json({success: false, message:"Server error"})
    };
}

const login=async(req, res)=>{
    const {email, password}=req.body;
    try {
        const user=await User.findOne({email}).select("+password");
        if(!user){
            return res.status(401).json({success :false,  message:"User not register"})
        }


      if (!user.isVerified) { 
        return res.status(401).json({ success: false, message: "Please verify your email first" });
       }
            
        const isPasswordCorrect= await bcrypt.compare(password,user.password);
        if(!isPasswordCorrect){
            return res.status(401).json({success: false, message:"User Unauthorized"});
        }
         const { accessToken, refreshToken } = issueTokens(user._id, user.role);

        const cookieOption = {
         httpOnly : true,
        secure : true,
        sameSite : true
        }


        res.cookie("refreshToken", refreshToken, cookieOption);
        return res.status(200).json({success:true, message:"User Login Successfully", accessToken, role:user.role });        
        
    } catch (error) {
        console.log("Login failed ",  error.message);
        return res.status(500).json({success:false, message:"Server Error"})
    }
}

const verifyOtp= async(req, res)=>{
   const { email , otp} = req.body;
     
   try {
    const user=await User.findOne({email});
    if(!user){
        return res.status(400).json({success: false, message: "User not found"});
    }

    if(user.isVerified){
        return res.status(400).json({success:true, message:"User Already verified"});
    }
    const hashOtp=crypto.createHash("sha256").update(otp).digest("hex");

    if(user.otp !== hashOtp || user.otpExpire < Date.now() ){
        return res.status(400).json({success:true, message:"Invalid OTP"});
    }

    user.isVerified=true;
    user.otp=undefined,
    user.otpExpire=undefined;
    await user.save();
    return res.status(200).json({success:true, message:"OTP verify"})

   } catch (error) {
    console.log("OTP verification failed ", error.message)
    return res.status(500).json({ success:false, message:"Serer Error"})
   }
}


const forgotPassword=async(req, res)=>{
    try {
        const { email}=req.body;
        const user=await User.findOne({email});
        if(!user){
            return res.status(400).json({success:false, message:"User not found"});
        }

        const {token, hashedToken}= generateCryptoToken();

        const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

        const subject="MusafirBaba - Password Reset";
        const emailBody=`Click this link to reset your password: ${resetUrl}`

        const emailResponse=await sendEmail(email, subject, emailBody);

        if (!emailResponse || emailResponse.error!==null) {
            console.error("Email sending failed:", emailResponse.error);
            return res.status(500).json({ success: false, message: "Could not send verification email" });
    }

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; 
        await user.save({ validateBeforeSave: false });


        return res.status(200).json({success:true, message:"Password reset link sent to email"});

    } catch (error) {
        console.log("Forgot password error:" , error.message)
        return res.status(500).json({success:false, message:"Server Error"})
    }
}

const resetPassword=async (req, res)=>{
    try {
        const {token}= req.params;
        const {password}=req.body;

        const hashedToken=crypto.createHash("sha256").update(token).digest("hex");

        const user=await User.findOne({
            resetPasswordToken:hashedToken,
            resetPasswordExpire:{$gt:Date.now()},
        });
        
        if(!user){
            return res.status(400).json({success:false, message:"Invalid or expired token"});
        }

        const hashedpassword=await bcrypt.hash(password,10);

        user.password=hashedpassword;
        user.resetPasswordToken=undefined;
        user.resetPasswordExpire=undefined;
        await user.save();

        return res.status(200).json({success:true, message:"Password reset successful. You can now log in."});
    } catch (error) {
        console.log("Reset password error:", error.message);
        return res.status(500).json({success:false, message:"Server error"})
    }
}

const refresh=async (req, res)=>{
    try {
        const token = req.cookies?.refreshToken;
        if(!token){
            return res.status(401).json({success:false, message:"Unauthorized"});
        }

        const payload = verifyRefresh(token);

        const { accessToken, refreshToken } = issueTokens(payload.sub, payload.role);
        const cookieOptions = {
            httpOnly : true,
            secure : true,
            sameSite : true
        }

        res.cookie("refresh_token", refreshToken, cookieOptions);

        return res.json({ accessToken , role:payload.role });

    } catch (error) {
        console.log("Refresh token error:", error.message);
        return res.status(500).json({success:false, message:"Server error"});
    }
}

const me= async(req, res)=>{
    try {
        const {token}= req.headers.authorization.split(" ")[1];
        const verifyedToken=verifyAccess(token);
        if(!verifyedToken){
            return res.status(401).json({success:false, message:"Unauthorized"});
        }
        const user=await User.findById(verifyedToken.sub).select("-password");
        return res.status(200).json({success:true, data:user});
    } catch (error) {
        console.log("Me error:", error.message);
        return res.status(500).json({success:false, message:"Server error"});
    }
}

const logout =async(req, res)=>{
    try {
        const cookieOptions = {
            httpOnly : true,
            secure : true,
            sameSite : true
        }
        res.clearCookie("refreshToken", cookieOptions);
        return res.status(200).json({success:true, message:"Logout successful"});
    } catch (error) {
        console.log("Logout error:", error.message);
        return res.status(500).json({success:false, message:"Server error"});
    } 
    
}

export {register, login, verifyOtp , forgotPassword , resetPassword , refresh , me, logout};