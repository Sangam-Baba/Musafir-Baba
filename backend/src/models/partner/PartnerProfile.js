import mongoose from "mongoose";

const partnerProfileSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerAuth",
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    fatherName: {
      type: String,
    },
    dob: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    mobileNumber: {
      type: String,
      default: "",
    },
    alternateMobileNumber: {
      type: String,
    },
    whatsappNumber: {
      type: String,
    },
    profilePicture: {
      type: String,
    },
    agencyName: {
      type: String,
    },
    partnerType: {
      type: String,
      enum: ["Individual", "Fleet Owner", "Travel Agency", "Company"],
      required: true,
    },
    emergencyContactName: {
      type: String,
    },
    emergencyContactNumber: {
      type: String,
    },
    preferredLanguage: {
      type: String,
      default: "English",
    },
    profileCompletionPercentage: {
      type: Number,
      default: 10,
    },
    isSubmittedForApproval: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    pricingConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    pushToken: {
      type: String,
      default: "",
    },
    // Spendable balance — only increased via an admin releasing funds from
    // pendingWalletBalance, or a manual admin adjustment. Never written to
    // directly on trip completion.
    walletBalance: {
      type: Number,
      default: 0,
    },
    // Trip earnings land here first on ride completion and stay here until
    // an admin manually releases them into walletBalance (no automatic
    // timer — the 24-hour window is driver-facing messaging only).
    pendingWalletBalance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.PartnerProfile ||
  mongoose.model("PartnerProfile", partnerProfileSchema);
