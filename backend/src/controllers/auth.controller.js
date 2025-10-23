import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sendEmail from "../services/email.service.js";
import generateCryptoToken from "../utils/generateCryptoToken.js";
import { uploadToCloudinary } from "../services/fileUpload.service.js";
import crypto from "crypto";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccess,
  verifyRefresh,
} from "../utils/tokens.js";
import mongoose from "mongoose";
function issueTokens(userId, role) {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = signRefreshToken({ sub: userId, role });
  return { accessToken, refreshToken };
}
const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const isExist = await User.findOne({ email });
    if (isExist && isExist.isVerified) {
      return res
        .status(409)
        .json({ success: false, message: "User Already exist" });
    }
    if (isExist && !isExist.isVerified) {
      await User.findByIdAndDelete(isExist._id);
    }
    let avatar = null;
    if (req.files?.avatar) {
      const result = await uploadToCloudinary(
        req.files.avatar[0].buffer,
        "avatars"
      );
      avatar = result.secure_url;
    }

    const hashedpassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(Math.random() * 1000000);

    const { token, hashedToken } = generateCryptoToken();

    const user = new User({
      name,
      email,
      password: hashedpassword,
      avatar,
      otp: otp,
      otpExpire: Date.now() + 60 * 60 * 1000,
    });

    const subject = "Verify your Musafir-Baba account";
    const emailBody = `Hi! ${name}, your OTP is ${otp} `;
    const emailResponse = await sendEmail(email, subject, emailBody);

    if (!emailResponse || emailResponse.error !== null) {
      console.error("Email sending failed:", emailResponse.error);
      return res
        .status(500)
        .json({ success: false, message: "Could not send verification email" });
    }

    await user.save();
    return res.status(201).json({
      success: true,
      message:
        "User Registerrd Successfully, Please verify email with OTP sent.",
    });
  } catch (error) {
    console.log("Registration failed", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not register" });
    }

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ success: false, message: "Please verify your email first" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res
        .status(401)
        .json({ success: false, message: "User Unauthorized" });
    }
    const { accessToken, refreshToken } = issueTokens(user._id, user.role);

    const cookieOption = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    };

    res.cookie("refreshToken", refreshToken, cookieOption);
    return res.status(200).json({
      success: true,
      message: "User Login Successfully",
      accessToken,
      role: user.role,
    });
  } catch (error) {
    console.log("Login failed ", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: true, message: "User Already verified" });
    }
    // const hashOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const hashOtp = otp;
    if (user.otp !== hashOtp || user.otpExpire < Date.now()) {
      return res.status(400).json({ success: true, message: "Invalid OTP" });
    }

    user.isVerified = true;
    (user.otp = undefined), (user.otpExpire = undefined);
    await user.save();
    const { accessToken, refreshToken } = issueTokens(user._id, user.role);

    const cookieOption = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    };

    res.cookie("refreshToken", refreshToken, cookieOption);
    return res.status(200).json({
      success: true,
      message: "OTP verify",
      accessToken,
      role: user.role,
    });
  } catch (error) {
    console.log("OTP verification failed ", error.message);
    return res.status(500).json({ success: false, message: "Serer Error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const { token, hashedToken } = generateCryptoToken();

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    const subject = "MusafirBaba - Password Reset";
    const emailBody = `Click this link to reset your password: ${resetUrl}`;

    const emailResponse = await sendEmail(email, subject, emailBody);

    if (!emailResponse || emailResponse.error !== null) {
      console.error("Email sending failed:", emailResponse.error);
      return res
        .status(500)
        .json({ success: false, message: "Could not send verification email" });
    }

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json({ success: true, message: "Password reset link sent to email" });
  } catch (error) {
    console.log("Forgot password error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const hashedpassword = await bcrypt.hash(password, 10);

    user.password = hashedpassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    console.log("Reset password error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    console.log(req.cookies);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Missing refresh token or Unauthorized",
      });
    }

    const payload = verifyRefresh(token);

    const { accessToken, refreshToken } = issueTokens(
      payload.sub,
      payload.role
    );
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    };

    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.json({ accessToken, role: payload.role });
  } catch (error) {
    console.log("Refresh token error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const verifiedToken = verifyAccess(token);

    if (!verifiedToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(verifiedToken.sub).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Me error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const logout = async (req, res) => {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    };
    res.clearCookie("refreshToken", cookieOptions);
    return res
      .status(200)
      .json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.log("Logout error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { email } = req.query;
    if (email) {
      const user = await User.find({ email });
      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "User not found" });
      }
      return res.status(200).json({ success: true, data: user });
    }
    const users = await User.find();
    if (!users) {
      return res
        .status(400)
        .json({ success: false, message: "Users not found" });
    }
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.log("Get all users error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const changeRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User id not found" });
    }
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    user.role = role || "user";
    await user.save();
    return res
      .status(200)
      .json({ success: true, message: "Role changed successfully" });
  } catch (error) {
    console.log("Change role error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User id not found" });
    }
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    user.isActive = !user.isActive;
    await user.save();
    return res
      .status(200)
      .json({ success: true, message: "User blocked successfully" });
  } catch (error) {
    console.log("Block user error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  register,
  login,
  verifyOtp,
  forgotPassword,
  resetPassword,
  refresh,
  me,
  logout,
  getAllUsers,
  changeRole,
  blockUser,
};
