import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import RiderAuth from "../../models/rider/RiderAuth.js";
import RiderProfile from "../../models/rider/RiderProfile.js";
import sendEmail from "../../services/email.service.js";

// Helper: Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// @route   POST /api/rider/auth/register
// @desc    Register a new rider (fullName + mobile collected up-front) and send Email OTP
export const registerRider = async (req, res) => {
  try {
    const { fullName, email, mobileNumber, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "Full name, email and password are required" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    let rider = await RiderAuth.findOne({ email });

    if (rider) {
      if (rider.isEmailVerified) {
        return res.status(400).json({ success: false, message: "Email already registered" });
      }
      // If email is not verified, allow them to retry registration (updates password and OTP)
      rider.password = hashedPassword;
      rider.otpToken = otp;
      rider.otpExpiry = otpExpiry;
      await rider.save();
    } else {
      rider = new RiderAuth({
        email,
        password: hashedPassword,
        otpToken: otp,
        otpExpiry,
      });
      await rider.save();
    }

    // Upsert the profile alongside auth, since mbgo collects everything on one screen
    await RiderProfile.findOneAndUpdate(
      { authId: rider._id },
      { $set: { fullName, mobileNumber: mobileNumber || "" } },
      { upsert: true, new: true }
    );

    const emailSubject = "Verify your MBGO Account";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>MBGO Registration Verification</h2>
        <p>Thank you for registering. Please use the following OTP to verify your email address:</p>
        <h1 style="color: #FF3B00; letter-spacing: 5px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
    `;
    await sendEmail(email, emailSubject, emailHtml);

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for the OTP.",
    });
  } catch (error) {
    console.error("Rider Registration Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/rider/auth/verify-otp
// @desc    Verify the email OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const rider = await RiderAuth.findOne({ email });

    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    if (rider.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    if (rider.otpToken !== otp || rider.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    rider.isEmailVerified = true;
    rider.otpToken = undefined;
    rider.otpExpiry = undefined;
    rider.status = "Active";
    await rider.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    console.error("Rider OTP Verification Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/rider/auth/resend-otp
// @desc    Resend the verification OTP to an unverified email
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const rider = await RiderAuth.findOne({ email });

    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    if (rider.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified. Please login." });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    rider.otpToken = otp;
    rider.otpExpiry = otpExpiry;
    await rider.save();

    const emailSubject = "Your New MBGO Verification OTP";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>MBGO Registration Verification</h2>
        <p>You requested a new OTP to verify your email address:</p>
        <h1 style="color: #FF3B00; letter-spacing: 5px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
    `;
    await sendEmail(email, emailSubject, emailHtml);

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("Rider Resend OTP Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/rider/auth/check-email
// @desc    Check if an email is already registered (smart check before signup)
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const rider = await RiderAuth.findOne({ email });

    if (!rider) {
      return res.status(200).json({ success: true, exists: false, message: "Email is available" });
    }

    if (rider.isEmailVerified) {
      return res.status(200).json({ success: true, exists: true, isVerified: true, message: "Email already registered and verified." });
    } else {
      return res.status(200).json({ success: true, exists: true, isVerified: false, message: "Email registered but not verified." });
    }
  } catch (error) {
    console.error("Rider Check Email Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/rider/auth/login
// @desc    Login rider and return JWT (Access + Refresh tokens)
export const loginRider = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const rider = await RiderAuth.findOne({ email });

    if (!rider) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!rider.isEmailVerified) {
      return res.status(403).json({ success: false, message: "Please verify your email first" });
    }

    if (rider.status === "Suspended") {
      return res.status(403).json({ success: false, message: "Your account is suspended. Contact support." });
    }

    const isMatch = await bcrypt.compare(password, rider.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const payload = {
      riderId: rider._id,
      role: "Rider",
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY || "fallback_secret", { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET_KEY || "fallback_refresh_secret", { expiresIn: "7d" });

    rider.lastLogin = new Date();
    rider.refreshToken = refreshToken;
    await rider.save();

    res.cookie("rider_refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "strict",
    });

    const profile = await RiderProfile.findOne({ authId: rider._id });

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      accessToken,
      profile: profile
        ? { fullName: profile.fullName, mobileNumber: profile.mobileNumber, profilePicture: profile.profilePicture }
        : null,
    });
  } catch (error) {
    console.error("Rider Login Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/rider/auth/logout
// @desc    Logout rider and clear refresh token cookie
export const logoutRider = async (req, res) => {
  try {
    const { rider_refresh_token } = req.cookies || {};
    const authHeader = req.headers.authorization;

    if (rider_refresh_token) {
      await RiderAuth.findOneAndUpdate(
        { refreshToken: rider_refresh_token },
        { $unset: { refreshToken: 1 } }
      );
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || "fallback_secret");
        if (decoded && decoded.riderId) {
          await RiderAuth.findByIdAndUpdate(decoded.riderId, { $unset: { refreshToken: 1 } });
        }
      } catch (e) {
        // Token verification error ignored during logout cleanup
      }
    }

    res.clearCookie("rider_refresh_token");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Rider Logout Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/rider/auth/refresh
// @desc    Refresh access token using HTTP-only cookie
export const refreshAccessToken = async (req, res) => {
  try {
    const { rider_refresh_token } = req.cookies;

    if (!rider_refresh_token) {
      return res.status(401).json({ success: false, message: "No refresh token provided" });
    }

    jwt.verify(
      rider_refresh_token,
      process.env.JWT_REFRESH_SECRET_KEY || "fallback_refresh_secret",
      async (err, decoded) => {
        if (err) {
          return res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
        }

        const rider = await RiderAuth.findOne({
          _id: decoded.riderId,
          refreshToken: rider_refresh_token,
        });

        if (!rider) {
          return res.status(403).json({ success: false, message: "Invalid refresh token" });
        }

        if (rider.status === "Suspended") {
          return res.status(403).json({ success: false, message: "Account suspended" });
        }

        const payload = {
          riderId: rider._id,
          role: "Rider",
        };
        const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY || "fallback_secret", { expiresIn: "15m" });

        return res.status(200).json({
          success: true,
          accessToken: newAccessToken,
        });
      }
    );
  } catch (error) {
    console.error("Rider Refresh Token Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/rider/auth/forgot-password
// @desc    Send password reset OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const rider = await RiderAuth.findOne({ email });

    if (!rider) {
      return res.status(404).json({ success: false, message: "No account found with that email" });
    }

    const resetToken = generateOTP();
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000);

    rider.resetPasswordToken = resetToken;
    rider.resetPasswordExpiry = resetExpiry;
    await rider.save();

    const emailSubject = "MBGO Password Reset Request";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Reset Your Password</h2>
        <p>Use the following OTP to reset your password:</p>
        <h1 style="color: #FF3B00; letter-spacing: 5px;">${resetToken}</h1>
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
    console.error("Rider Forgot Password Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/rider/auth/reset-password
// @desc    Reset password using OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password are required" });
    }

    const rider = await RiderAuth.findOne({ email });

    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    if (rider.resetPasswordToken !== otp || rider.resetPasswordExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    rider.password = await bcrypt.hash(newPassword, salt);
    rider.resetPasswordToken = undefined;
    rider.resetPasswordExpiry = undefined;
    rider.refreshToken = undefined;
    await rider.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
  } catch (error) {
    console.error("Rider Reset Password Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/rider/auth/change-password
// @desc    Change password (Authenticated)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const riderId = req.riderId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new passwords are required" });
    }

    const rider = await RiderAuth.findById(riderId);

    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, rider.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    rider.password = await bcrypt.hash(newPassword, salt);
    await rider.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Rider Change Password Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
