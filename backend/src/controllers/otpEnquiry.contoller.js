import { EnquiryOtp } from "../models/OtpEnquiry.js";
import sendEmail from "../services/email.service.js";
import { verifyEmailTemplate } from "../utils/verifyEmailTemplate.js";
const createOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 60 * 1000 * 10;
    const subject = "Verify your Musafir-Baba account";
    const htmlBody = verifyEmailTemplate("User", otp);
    const emailResponse = await sendEmail(email, subject, htmlBody);
    if (!emailResponse || emailResponse.error !== null) {
      console.error("Email sending failed:", emailResponse.error);
      return res
        .status(500)
        .json({ success: false, message: "Could not send verification email" });
    }
    const newEnquiryOtp = await EnquiryOtp.create({ email, otp, otpExpiry });
    res.status(200).json({
      success: true,
      message: "OTP created successfully",
    });
  } catch (error) {
    console.log("Error creating otp", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const enquiryOtp = await EnquiryOtp.findOne({ email });
    if (!enquiryOtp) {
      return res.status(404).json({ success: false, message: "OTP not found" });
    }
    if (enquiryOtp.otp !== otp || enquiryOtp.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    await EnquiryOtp.findByIdAndUpdate(enquiryOtp._id, { verified: true });
    res
      .status(200)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.log("Error in verifying otp", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export { createOtp, verifyOtp };
