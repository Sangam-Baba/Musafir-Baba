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
    hightestQualification: {
      type: String,
      enum: ["Bachelors", "Graduate", "Masters", "PhD"],
    },
    age: {
      type: Number,
    },
    experience: {
      type: String,
      enum: ["Fresher", "1-3 years", "3-5 years", "5+ years"],
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
