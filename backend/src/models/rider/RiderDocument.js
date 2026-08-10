import mongoose from "mongoose";

// One record per rider (a rider currently uploads a single ID document, with
// both sides as explicit fields -- deliberately not split across two rows
// or an undeclared extra field, unlike the existing partner document model).
const riderDocumentSchema = new mongoose.Schema(
  {
    riderProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RiderProfile",
      required: true,
      unique: true,
    },
    documentType: {
      type: String,
      default: "ID Document",
    },
    documentName: {
      type: String,
    },
    documentIdNumber: {
      type: String,
    },
    fileUrlFront: {
      type: String,
    },
    fileUrlBack: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    remarks: {
      type: String,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.RiderDocument ||
  mongoose.model("RiderDocument", riderDocumentSchema);
