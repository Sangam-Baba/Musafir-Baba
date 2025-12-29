import mongoose, { mongo } from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    firstName: {
      type: String,

      trim: true,
    },
    address: {
      city: {
        type: String,
      },
      state: {
        type: String,
      },
      zipcode: {
        type: Number,
      },
    },
    travellers: {
      quad: {
        type: Number,
      },
      triple: {
        type: Number,
      },
      double: {
        type: Number,
      },
      child: {
        type: Number,
      },
    },
    bookingDate: {
      type: Date,
      default: Date.now(),
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["PayU", "Cash", "Online"],
      default: "PayU",
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
    bookingStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Pending",
    },
    specialRequests: {
      type: String,
      trim: true,
    },
    coupanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupan",
    },
    addOns: [{ title: String, price: Number, noOfPeople: Number }],
  },
  { timestamps: true }
);

export const Booking = mongoose.model("Booking", bookingSchema);
