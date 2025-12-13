import mongoose from "mongoose";

const membershipBookingSchema = new mongoose.Schema(
  {
    membershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
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
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    membershipStatus: {
      type: String,
      enum: ["Active", "Cancelled", "Expired"],
      default: "Cancelled",
    },
    expiredAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const MembershipBooking = mongoose.model(
  "MembershipBooking",

  membershipBookingSchema
);
