import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import sendEmail from "../services/email.service.js";
import generateCryptoToken from "../utils/generateCryptoToken.js"

const generateToken= (user)=>{
   return jwt.sign({id:user._id , role: user.role}, process.env.JWT_SECRET_KEY , {
    expiresIn:"7d",
   });
}
const register=async(req, res)=>{
    const {name, email, password, role}=req.body;
    try {
        const isExist=await User.findOne({email});
        if(isExist){
            return res.status(409).json({success:false, message:"User Already exist"})
        }

        const hashedpassword=await bcrypt.hash(password, 10);

        const { token, hashedToken }=generateCryptoToken();

        const subject="Verify your Musafir-Baba account";
        const emailBody=`Hi! Your OTP is: ${token}`
        await sendEmail(email, subject,emailBody);

        const user=new User({name, email, password:hashedpassword , role, otp:hashedToken, otpExpire:Date.now() + 10*60*1000});
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
        const token=generateToken(user);
        return res.status(200).json({success:true, message:"User Login Successfully", token,   
        user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
       });        
        
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
    return res.status(500),json({ success:false, message:"Serer Error"})
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

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

        const subject="MusafirBaba - Password Reset";
        const emailBody=`Click this link to reset your password: ${resetUrl}`

        await sendEmail(email, subject, emailBody);

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

export {register, login, verifyOtp , forgotPassword , resetPassword}