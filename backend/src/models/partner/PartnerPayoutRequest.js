import mongoose from "mongoose";

// MBConnect: driver's request to move wallet money to their bank account.
// The amount leaves walletBalance when requested (ledger "payout"); admin
// transfers it manually and marks it PAID with the UTR, or CANCELLED (money
// goes back to the wallet, ledger "payout_reversed").
const partnerPayoutRequestSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g. PO-K3F9X2
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "PartnerProfile", required: true, index: true },
    authId: { type: mongoose.Schema.Types.ObjectId, ref: "PartnerAuth", required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["REQUESTED", "PROCESSING", "PAID", "CANCELLED"],
      default: "REQUESTED",
      index: true,
    },
    // Bank details at the time of the request (what admin transfers to).
    bank: {
      accountHolderName: String,
      bankName: String,
      accountNumber: String,
      ifsc: String,
      upiId: String,
      status: String,
    },
    utr: { type: String },
    adminNote: { type: String },
    cancelReason: { type: String },
    cancelledBy: { type: String, enum: ["DRIVER", "ADMIN"] },
    processingAt: { type: Date },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    decidedById: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    decidedBy: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.PartnerPayoutRequest ||
  mongoose.model("PartnerPayoutRequest", partnerPayoutRequestSchema);
