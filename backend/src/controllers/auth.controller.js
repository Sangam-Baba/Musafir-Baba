import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sendEmail from "../services/email.service.js";
import generateCryptoToken from "../utils/generateCryptoToken.js";
import { uploadToCloudinary } from "../services/fileUpload.service.js";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { AuthLog } from "../models/AuthLog.js";
import { Session } from "../models/AuthSession.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccess,
  verifyRefresh,
} from "../utils/tokens.js";
import { verifyEmailTemplate } from "../utils/verifyEmailTemplate.js";
import { thankYouEmail } from "../utils/thankYouEmail.js";
import { UAParser } from "ua-parser-js";

function issueTokens(userId, role, sessionId, name) {
  const accessToken = signAccessToken({
    sub: userId,
    role,
    sessionId,
    name,
  });
  const refreshToken = signRefreshToken({
    sub: userId,
    role,
    sessionId,
    name,
  });
  return { accessToken, refreshToken };
}
export function parseUserAgent(ua = "") {
  if (!ua) return "Unknown";

  const parser = new UAParser(ua);
  const result = parser.getResult();

  return {
    browser: `${result.browser.name} ${result.browser.version}`,
    os: `${result.os.name} ${result.os.version}`,
    device: result.device.type || "Desktop",
  };
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

    const hashedpassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000);

    // const { token, hashedToken } = generateCryptoToken();

    const user = new User({
      name,
      email,
      password: hashedpassword,
      otp: otp,
      otpExpire: Date.now() + 60 * 60 * 1000,
    });

    const subject = "Verify your Musafir-Baba account";
    const htmlBody = verifyEmailTemplate(name, otp);
    // const emailBody = `Hi! ${name}, your OTP is ${otp} `;
    const emailResponse = await sendEmail(email, subject, htmlBody);

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
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      req.ip;

    const sessionId = uuid();
    await AuthLog.create({
      userId: user._id,
      sessionId,
      success: true,
      eventType: "login",
      ip: ip,
      userAgent: req.headers["user-agent"],
    });
    // Create session record
    await Session.create({
      userId: user._id,
      sessionId,
      ip: ip,
      userAgent: req.headers["user-agent"],
      status: "active",
      loginAt: new Date(),
      lastSeen: new Date(),
    });

    const { accessToken, refreshToken } = issueTokens(
      user._id,
      user.role,
      sessionId,
      user.name
    );

    const cookieOption = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: undefined,
      path: "/",
    };

    res.cookie("user_refresh_token", refreshToken, cookieOption);

    return res.status(200).json({
      success: true,
      message: "User Login Successfully",
      accessToken,
      role: user.role,
      name: user.name,
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
    const subject = "Welcome to Musafir-Baba";
    const htmlBody = thankYouEmail(user.name);
    const emailResponse = await sendEmail(user.email, subject, htmlBody);
    if (!emailResponse || emailResponse.error !== null) {
      console.error("Email sending failed:", emailResponse.error);
      return res
        .status(500)
        .json({ success: false, message: "Could not send Welcome email" });
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

    const otp = Math.floor(100000 + Math.random() * 900000);

    const subject = "MusafirBaba - Password Reset";
    const emailBody = `Enter this otp to reset your password: ${otp}`;

    const emailResponse = await sendEmail(email, subject, emailBody);

    if (!emailResponse || emailResponse.error !== null) {
      console.error("Email sending failed:", emailResponse.error);
      return res
        .status(500)
        .json({ success: false, message: "Could not send verification email" });
    }

    user.otp = otp;
    user.otpExpire = Date.now() + 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.log("Forgot password error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const verifyOtpForReset = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and Otp is required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    if (user.otp !== otp || user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid Otp" });
    }
    const resetPasswordToken = jwt.sign({ email }, process.env.JWT_SECRET_KEY, {
      expiresIn: "30m",
    });

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({
      success: true,
      message: "Otp verified for reset password",
      resetPasswordToken,
    });
  } catch (error) {
    console.log("Otp Not verify for reset password", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password, resetPasswordToken } = req.body;

    if (!password || !resetPasswordToken) {
      return res
        .status(400)
        .json({ success: false, message: "Password and token is required" });
    }
    const user = await User.findOne({
      resetPasswordToken: resetPasswordToken,
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
    const token = req.cookies?.user_refresh_token;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Missing refresh token or Unauthorized",
      });
    }

    const payload = verifyRefresh(token);
    console.log("payload: ", payload);
    const { accessToken, refreshToken } = issueTokens(
      payload.sub,
      payload.role,
      payload.sessionId,
      payload.name
    );
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: undefined,
      path: "/",
    };

    res.cookie("user_refresh_token", refreshToken, cookieOptions);

    return res.json({
      accessToken,
      role: payload.role,
      name: payload.name,
    });
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
    const { sessionId } = req.user;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid session or already logged out",
      });
    }
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: undefined,
      path: "/",
    };
    res.clearCookie("user_refresh_token", cookieOptions);
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
    await AuthLog.create({
      userId: req?.user?.sub,
      eventType: "logout",
      sessionId,
      ip: ip,
      userAgent: req.headers["user-agent"],
    });

    await Session.updateOne(
      { sessionId },
      { status: "logout", logoutAt: new Date() }
    );
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
    const query = {};
    if (req.query.email) query.email = req.query.email;
    if (req.query.role) query.role = req.query.role;

    // Step 1: get users
    const users = await User.find(query)
      .select("-password -refresh_token -otp -otpExpire")
      .lean();

    if (!users.length) {
      return res
        .status(404)
        .json({ success: false, message: "No users found" });
    }

    const userIds = users.map((u) => u._id);

    // Step 2: Lookup logs & sessions
    const [logs, sessions] = await Promise.all([
      AuthLog.find({ userId: { $in: userIds } })
        .sort({ timestamp: -1 })
        .lean(),
      Session.find({ userId: { $in: userIds } })
        .sort({ loginAt: -1 })
        .lean(),
    ]);
    // Step 3: Map each user with latest session + logs
    const result = users.map((user) => {
      const userLogs = logs.filter(
        (l) => String(l.userId) === String(user._id)
      );
      const userSessions = sessions.filter(
        (s) => String(s.userId) === String(user._id)
      );

      const lastLogin =
        userLogs.find(
          (log) =>
            log.eventType === "login" &&
            !log.userAgent.includes("PostmanRuntime")
        ) || userLogs.find((log) => log.eventType === "login");
      const lastLogout = userLogs.find((log) => log.eventType === "logout");
      const activeSession = userSessions.find((s) => s.status === "active");
      // console.log("UA:", lastLogin);
      return {
        ...user,
        loginInfo: {
          lastLoginAt: lastLogin?.timestamp || null,
          lastLogoutAt: lastLogout?.timestamp || null,
          device: lastLogin ? parseUserAgent(lastLogin.userAgent) : "Unknown",
          ip: lastLogin?.ip || null,
          multipleDevices: userSessions.length > 1,
          currentStatus: activeSession ? "Online" : "Offline",
        },
      };
    });

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.log("GetAllUsers error:", error);
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
    const deleteUser = await User.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.log("Delete user error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "user not found" });
    }
    // if (req.body?.password) {
    //   const hashedpassword = await bcrypt.hash(req.body.password, 10);
    //   req.body.password = hashedpassword;
    // }
    const updatedUser = await User.findByIdAndUpdate(id, req.body, {
      new: true,
    }).select("name email phone permissions");
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.log("update user error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const admin = await User.findById(id).select(
      " name email phone permissions role"
    );
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }
    res.status(200).json({
      success: true,
      message: "Admin found successfully",
      data: admin,
    });
  } catch (error) {
    console.log("getting admin by id error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const userUpdatePassword = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordCorrect) {
      return res
        .status(401)
        .json({ success: false, message: "Old password is incorrect" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.log("update password error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
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
  updateAdmin,
  getAdminById,
  userUpdatePassword,
  verifyOtpForReset,
};
