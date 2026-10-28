import mongoose from "mongoose";

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// Office shift (IST). A staffer counts as Late when they check in after
// startTime + graceMinutes. Shifts don't cross midnight (endTime > startTime)
// because attendance days are split at IST midnight.
const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    startTime: {
      type: String,
      required: true,
      match: HHMM_REGEX,
    },
    endTime: {
      type: String,
      required: true,
      match: HHMM_REGEX,
    },
    graceMinutes: {
      type: Number,
      default: 15,
      min: 0,
      max: 180,
    },
  },
  { timestamps: true }
);

export const Shift = mongoose.model("Shift", shiftSchema);
