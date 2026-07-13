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

// @route   POST /api/partner/auth/login
// @desc    Login partner and return JWT
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

    // Generate JWT
    const payload = {
      partnerId: partner._id,
      role: "Partner",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY || "fallback_secret", { expiresIn: "1d" });

    partner.lastLogin = new Date();
    await partner.save();

    // Send token in HTTP-only cookie (if applicable) or in body
    res.cookie("partner_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
    });
  } catch (error) {
    console.error("Partner Login Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
