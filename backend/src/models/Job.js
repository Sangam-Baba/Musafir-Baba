import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      default: "Delhi, India",
    },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Internship", "Contract"],
      default: "Full-time",
    },
    experienceLevel: {
      type: String,
      enum: ["Fresher", "1-3 years", "3-5 years", "5+ years"],
      default: "Fresher",
    },
    salaryRange: {
      type: String,
      default: "As per industry standards",
    },
    description: {
      type: String,
    },
    responsibilities: [
      {
        name: String,
      },
    ],
    requirements: [
      {
        name: String,
      },
    ],
    skills: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Job = mongoose.model("Job", jobSchema);
