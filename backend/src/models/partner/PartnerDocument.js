import mongoose from "mongoose";

const partnerDocumentSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerType",
    },
    ownerType: {
      type: String,
      required: true,
      enum: ["PartnerProfile", "PartnerVehicle", "PartnerDriver"],
    },
    documentType: {
      type: String,
      required: true,
      // e.g., Aadhaar, PAN, RC, Permit, Licence, Cancelled Cheque
    },
    fileUrl: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Expired", "Re-upload Required", "Archived"],
      default: "Pending",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin who verified
    },
    verificationDate: {
      type: Date,
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index to quickly find documents for a specific owner
partnerDocumentSchema.index({ ownerType: 1, ownerId: 1 });
// Index to quickly find pending documents for admin dashboard
partnerDocumentSchema.index({ status: 1 });

export default mongoose.models.PartnerDocument ||
  mongoose.model("PartnerDocument", partnerDocumentSchema);
