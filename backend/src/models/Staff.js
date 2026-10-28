import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "superadmin", "staff"],
      default: "staff",
    },
    permissions: [String],
    designation: {
      type: String,
    },
    avatar: {
      type: String,
    },
    refresh_token: {
      type: String,
      default: "",
    },
    otp: String,
    otpExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    attendanceEligible: {
      type: Boolean,
      default: true,
    },
    // Assigned office shift. When null, check-in falls back to the default
    // 9:15 AM late rule. Only changed through /api/shifts (admin only).
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },
    joiningDate: {
      type: Date,
      default: null,
    },
    dateOfLeaving: {
      type: Date,
      default: null,
    },
    totalLeaveBalance: {
      type: Number,
      default: 0,
    },
    availableLeaveBalance: {
      type: Number,
      default: 0,
    },
    totalShortLeaveBalance: {
      type: Number,
      default: 0,
    },
    availableShortLeaveBalance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Staff = mongoose.model("Staff", staffSchema);
