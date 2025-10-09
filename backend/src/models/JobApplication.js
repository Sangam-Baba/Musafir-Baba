import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    coverLetter: {
      type: String,
    },
    resumeUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Reviewed", "Shortlisted", "Rejected", "Hired"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export const JobApplication = mongoose.model(
  "JobApplication",
  jobApplicationSchema
);
