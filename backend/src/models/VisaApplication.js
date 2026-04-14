import mongoose from "mongoose";

const visaApplicationSchema = new mongoose.Schema(
  {
    visaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visa",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Optional initially because unauthenticated users can start the application
    },
    applicationId: {
      type: String, // Or just use _id
    },
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    travellers: [
      {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        dob: { type: String, required: true },
        gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
      },
    ],
    documents: [
      {
        name: { type: String }, // e.g., "Passport", "Photo"
        media: {
          url: String,
          key: String,
          format: String,
          size: Number,
        },
      },
    ],
    currentStep: {
      type: Number,
      default: 1, // 1: Travellers, 2: Documents, 3: Review/Payment
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["PayU", "Cash", "Online"],
      default: "PayU",
    },
    paymentInfo: {
      orderId: String,
      paymentId: String,
      signature: String,
      status: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending",
      },
    },
    applicationStatus: {
      type: String,
      enum: ["Pending", "Submitted", "Processing", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export const VisaApplication = mongoose.model("VisaApplication", visaApplicationSchema);
