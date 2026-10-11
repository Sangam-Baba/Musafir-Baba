import mongoose from "mongoose";

// Rider cancellations from the MBGo app (cabs, tours, visa). New collection.
//  type INSTANT  -> booking cancelled immediately (cabs, and anything unpaid)
//  type REQUEST  -> paid tour/visa: the team approves or rejects
// Refunds are never automatic: refund.status PENDING until admin marks it.
const cancellationRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, unique: true, index: true }, // "MBGC000001"
    service: { type: String, enum: ["CAB", "TOUR", "VISA"], required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    bookingCode: String,
    bookingTitle: String,
    bookingSubtitle: String,
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "RiderProfile", required: true, index: true },
    reasonKey: { type: String, required: true },
    reasonLabel: String,
    comment: { type: String, trim: true, maxlength: 1000 },
    type: { type: String, enum: ["INSTANT", "REQUEST"], required: true },
    status: { type: String, enum: ["REQUESTED", "APPROVED", "REJECTED"], required: true, index: true },
    paidAmount: { type: Number, default: 0 },
    // Stage the booking was in when cancelled (e.g. ride ACCEPTED, visa Submitted).
    bookingStatusAtRequest: String,
    refund: {
      status: { type: String, enum: ["NOT_APPLICABLE", "PENDING", "REFUNDED"], default: "NOT_APPLICABLE", index: true },
      amount: Number,
      reference: String,
      note: String,
      processedAt: Date,
      processedBy: String,
    },
    adminNote: { type: String, trim: true, maxlength: 1000 },
    decidedAt: Date,
    decidedBy: String,
  },
  { timestamps: true }
);

export const CancellationRequest =
  mongoose.models.CancellationRequest || mongoose.model("CancellationRequest", cancellationRequestSchema);
