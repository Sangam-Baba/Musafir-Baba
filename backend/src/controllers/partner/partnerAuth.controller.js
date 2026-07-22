import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import PartnerAuth from "../../models/partner/PartnerAuth.js";
import sendEmail from "../../services/email.service.js";

// Helper: Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// @route   POST /api/partner/auth/register
// @desc    Register a new partner and send Email OTP
export const registerPartner = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    let existingPartner = await PartnerAuth.findOne({ email });
    
    if (existingPartner) {
      if (existingPartner.isEmailVerified) {
        return res.status(400).json({ success: false, message: "Email already registered" });
      }
      // If email is not verified, allow them to retry registration (updates password and OTP)
      existingPartner.password = hashedPassword;
      existingPartner.otpToken = otp;
      existingPartner.otpExpiry = otpExpiry;
      await existingPartner.save();
    } else {
      // Create new partner
      const partner = new PartnerAuth({
        email,
        password: hashedPassword,
        otpToken: otp,
        otpExpiry,
      });
      await partner.save();
    }

    // Send OTP via Email
    const emailSubject = "Verify your Partner Registration";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Partner Registration Verification</h2>
        <p>Thank you for registering. Please use the following OTP to verify your email address:</p>
        <h1 style="color: #FE5300; letter-spacing: 5px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
    `;
    await sendEmail(email, emailSubject, emailHtml);

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for the OTP.",
    });
  } catch (error) {
    console.error("Partner Registration Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/partner/auth/verify-otp
// @desc    Verify the email OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const partner = await PartnerAuth.findOne({ email });

    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    if (partner.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    if (partner.otpToken !== otp || partner.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    partner.isEmailVerified = true;
    partner.otpToken = undefined;
    partner.otpExpiry = undefined;
    partner.status = "Active"; // Set status to Active upon email verification
    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/partner/auth/resend-otp
// @desc    Resend the verification OTP to an unverified email
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const partner = await PartnerAuth.findOne({ email });

    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    if (partner.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified. Please login." });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    partner.otpToken = otp;
    partner.otpExpiry = otpExpiry;
    await partner.save();

    // Send Reset Email
    const emailSubject = "Your New Partner Registration OTP";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Partner Registration Verification</h2>
        <p>You requested a new OTP to verify your email address:</p>
        <h1 style="color: #FE5300; letter-spacing: 5px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
    `;
    await sendEmail(email, emailSubject, emailHtml);

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/partner/auth/check-email
// @desc    Check if an email is already registered (smart check before signup)
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const partner = await PartnerAuth.findOne({ email });

    if (!partner) {
      return res.status(200).json({ success: true, exists: false, message: "Email is available" });
    }

    if (partner.isEmailVerified) {
      return res.status(200).json({ success: true, exists: true, isVerified: true, message: "Email already registered and verified." });
    } else {
      return res.status(200).json({ success: true, exists: true, isVerified: false, message: "Email registered but not verified." });
    }
  } catch (error) {
    console.error("Check Email Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/partner/auth/login
// @desc    Login partner and return JWT (Access + Refresh tokens)
export const loginPartner = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const partner = await PartnerAuth.findOne({ email });

    if (!partner) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!partner.isEmailVerified) {
      return res.status(403).json({ success: false, message: "Please verify your email first" });
    }

    if (partner.status === "Suspended") {
      return res.status(403).json({ success: false, message: "Your account is suspended. Contact admin." });
    }

    const isMatch = await bcrypt.compare(password, partner.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT Access Token (short-lived)
    const payload = {
      partnerId: partner._id,
      role: "Partner",
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY || "fallback_secret", { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET_KEY || "fallback_refresh_secret", { expiresIn: "7d" });

    partner.lastLogin = new Date();
    partner.refreshToken = refreshToken;
    await partner.save();

    // Send refresh token in HTTP-only cookie
    res.cookie("partner_refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      accessToken,
    });
  } catch (error) {
    console.error("Partner Login Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/partner/auth/logout
// @desc    Logout partner and clear refresh token cookie
export const logoutPartner = async (req, res) => {
  try {
    const { partner_refresh_token } = req.cookies;

    if (partner_refresh_token) {
      // Find partner and remove refresh token
      await PartnerAuth.findOneAndUpdate(
        { refreshToken: partner_refresh_token },
        { $unset: { refreshToken: 1 } }
      );
    }

    res.clearCookie("partner_refresh_token");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Partner Logout Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/partner/auth/refresh
// @desc    Refresh access token using HTTP-only cookie
export const refreshAccessToken = async (req, res) => {
  try {
    const { partner_refresh_token } = req.cookies;

    if (!partner_refresh_token) {
      return res.status(401).json({ success: false, message: "No refresh token provided" });
    }

    // Verify token
    jwt.verify(
      partner_refresh_token,
      process.env.JWT_REFRESH_SECRET_KEY || "fallback_refresh_secret",
      async (err, decoded) => {
        if (err) {
          return res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
        }

        // Check if token matches the one in DB
        const partner = await PartnerAuth.findOne({
          _id: decoded.partnerId,
          refreshToken: partner_refresh_token,
        });

        if (!partner) {
          return res.status(403).json({ success: false, message: "Invalid refresh token" });
        }

        if (partner.status === "Suspended") {
          return res.status(403).json({ success: false, message: "Account suspended" });
        }

        // Issue new access token
        const payload = {
          partnerId: partner._id,
          role: "Partner",
        };
        const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY || "fallback_secret", { expiresIn: "15m" });

        return res.status(200).json({
          success: true,
          accessToken: newAccessToken,
        });
      }
    );
  } catch (error) {
    console.error("Partner Refresh Token Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/partner/auth/forgot-password
// @desc    Send password reset OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const partner = await PartnerAuth.findOne({ email });

    if (!partner) {
      return res.status(404).json({ success: false, message: "No partner found with that email" });
    }

    const resetToken = generateOTP();
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    partner.resetPasswordToken = resetToken;
    partner.resetPasswordExpiry = resetExpiry;
    await partner.save();

    // Send Reset Email
    const emailSubject = "Partner Password Reset Request";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Reset Your Password</h2>
        <p>Use the following OTP to reset your password:</p>
        <h1 style="color: #FE5300; letter-spacing: 5px;">${resetToken}</h1>
        <p>This OTP will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `;
    await sendEmail(email, emailSubject, emailHtml);

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to email",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/partner/auth/reset-password
// @desc    Reset password using OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password are required" });
    }

    const partner = await PartnerAuth.findOne({ email });

    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    if (partner.resetPasswordToken !== otp || partner.resetPasswordExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    partner.password = await bcrypt.hash(newPassword, salt);
    partner.resetPasswordToken = undefined;
    partner.resetPasswordExpiry = undefined;

    // Optional: Log them out of all devices by clearing refresh token
    partner.refreshToken = undefined;
    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/partner/auth/change-password
// @desc    Change password (Authenticated)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // partnerId is attached by the auth middleware
    const partnerId = req.partnerId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new passwords are required" });
    }

    const partner = await PartnerAuth.findById(partnerId);

    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, partner.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    partner.password = await bcrypt.hash(newPassword, salt);
    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
