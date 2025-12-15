import mongoose from "mongoose";

const enquiryOtpSchema = new mongoose.Schema(
  {
    otp: {
      type: String,
      required: true,
    },
    otpExpiry: {
      type: Date,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const EnquiryOtp = mongoose.model("EnquiryOtp", enquiryOtpSchema);
