import mongoose from "mongoose";

// One PayU payment attempt for a recharge. PENDING -> PAID happens once (atomic),
// so a repeated PayU callback can never credit twice.
const partnerRechargeOrderSchema = new mongoose.Schema(
  {
    txnid: { type: String, required: true, unique: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "PartnerProfile", required: true, index: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["PENDING", "PAID", "FAILED"], default: "PENDING", index: true },
    mihpayid: { type: String },
    // Secret for the one-time checkout page link (opened in the phone browser).
    checkoutKey: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.PartnerRechargeOrder || mongoose.model("PartnerRechargeOrder", partnerRechargeOrderSchema);
