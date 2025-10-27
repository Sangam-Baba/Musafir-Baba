import mongoose from "mongoose";

const customizedTourBookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomizedTourPackage",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    noOfPeople: {
      type: Number,
      default: 1,
      min: 1,
    },
    plan: {
      type: String,
    },
    totalPrice: {
      type: Number,
      default: 1,
      min: 1,
    },
    bookingStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Pending",
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
  },
  { timestamps: true }
);

export const CustomizedTourBooking = mongoose.model(
  "CustomizedTourBooking",
  customizedTourBookingSchema
);
