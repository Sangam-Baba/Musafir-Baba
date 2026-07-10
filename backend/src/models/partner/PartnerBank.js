import mongoose from "mongoose";

const partnerBankSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerProfile",
      required: true,
    },
    accountHolderName: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    branchName: {
      type: String,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    ifsc: {
      type: String,
      required: true,
    },
    upiId: {
      type: String,
    },
    cancelledChequeUrl: {
      type: String, // Cloudflare R2 / S3 URL
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.PartnerBank ||
  mongoose.model("PartnerBank", partnerBankSchema);
