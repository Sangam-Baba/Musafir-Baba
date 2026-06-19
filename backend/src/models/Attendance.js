import mongoose from "mongoose";

const breakSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date },
});

const attendanceSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    checkInTime: { type: Date },
    checkInLocation: {
      lat: Number,
      lng: Number,
      distance: Number,
    },
    checkInPhotoUrl: { type: String },
    checkOutTime: { type: Date },
    checkOutLocation: {
      lat: Number,
      lng: Number,
      distance: Number,
    },
    checkOutPhotoUrl: { type: String },
    breaks: [breakSchema],
    totalOfficeHours: {
      type: Number,
      default: 0,
    },
    totalWorkingHours: {
      type: Number,
      default: 0,
    },
    leaveType: {
      type: String,
      enum: ["none", "Leave", "Short Leave", "Half Day", "WFH"],
      default: "none",
    },
    leaveStatus: {
      type: String,
      enum: ["none", "Pending", "Approved", "Rejected"],
      default: "none",
    },
    leaveReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const Attendance = mongoose.model("Attendance", attendanceSchema);
