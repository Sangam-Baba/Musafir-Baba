import mongoose from "mongoose";

// Holiday-package bookings made from the MBGo rider app. Kept separate from
// the website's Booking collection (which belongs to website user accounts)
// so neither flow can affect the other. Prices are computed server-side
// (services/tourAppPricing.service.js) and snapshotted here at booking time.

const lineSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["quad", "triple", "double", "child"], required: true },
    count: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const tourAppBookingSchema = new mongoose.Schema(
  {
    rider: { type: mongoose.Schema.Types.ObjectId, ref: "RiderProfile", required: true, index: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },

    // Snapshots, so the booking still reads correctly if the package changes later.
    packageTitle: { type: String, required: true },
    packageImage: { type: String },
    destinationName: { type: String },
    durationDays: { type: Number },
    durationNights: { type: Number },
    startDate: { type: Date, required: true },
    endDate: { type: Date },

    travellers: {
      quad: { type: Number, default: 0 },
      triple: { type: Number, default: 0 },
      double: { type: Number, default: 0 },
      child: { type: Number, default: 0 },
    },
    priceLines: { type: [lineSchema], default: [] },
    addOns: {
      type: [
        new mongoose.Schema(
          { itemId: String, group: String, title: String, price: Number, noOfPeople: Number, amount: Number },
          { _id: false }
        ),
      ],
      default: [],
    },
    addOnsAmount: { type: Number, default: 0 },
    baseAmount: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },

    paymentOption: { type: String, enum: ["FULL", "ADVANCE"], default: "FULL" },
    payNowAmount: { type: Number, required: true },
    balanceAmount: { type: Number, default: 0 },
    balanceDueDate: { type: Date },

    paymentInfo: {
      txnid: String,
      mihpayid: String,
      status: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
      paidAt: Date,
    },
    bookingStatus: {
      type: String,
      enum: ["PaymentPending", "Confirmed", "Cancelled"],
      default: "PaymentPending",
    },
  },
  { timestamps: true }
);

export const TourAppBooking =
  mongoose.models.TourAppBooking || mongoose.model("TourAppBooking", tourAppBookingSchema);
