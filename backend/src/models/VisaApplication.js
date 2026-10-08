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
        travellerId: { type: String }, // Link document to a specific traveller
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
      enum: ["Pending", "Submitted", "Processing", "Approved", "Rejected", "Returned", "Applied", "Under Review", "Reviewed"],
      default: "Pending",
    },
    returnReason: {
      type: String,
    },
    selectedVisaId: {
      type: String,
    },
    isExpress: {
      type: Boolean,
      default: false,
    },
    // ---- Optional fields used by applications made from the MBGo rider app
    // (routes/visaApp.routes.js). Website applications never set them. ----
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RiderProfile",
      index: true,
    },
    // Which validity option of the chosen visa type was picked.
    selectedValidityIndex: {
      type: Number,
    },
    // Answers to the app's eligibility questions (guidance only).
    eligibility: {
      purpose: String,
      travelDate: String,
      stayDuration: String,
      travellerCount: Number,
    },
    // Set when a "Returned" application is fixed and resubmitted from the app.
    resubmittedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const VisaApplication = mongoose.model("VisaApplication", visaApplicationSchema);
