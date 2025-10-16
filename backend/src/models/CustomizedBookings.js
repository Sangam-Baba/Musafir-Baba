import mongoose from "mongoose";

const customizedBookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customizedPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomizedPackage",
      required: true,
    },
    numberOfPeople: {
      type: Number,
      required: true,
      default: 1,
    },
    duration: {
      durationType: {
        type: String,
        enum: ["fixed", "flexible"],
      },

      fixed: {
        startDate: { type: String },
        endDate: { type: String },
        totalDays: Number,
      },
      flexible: {
        month: String,
        totalDays: Number,
      },
    },
    transportType: {
      name: {
        type: String,
        enum: ["5-Seater", "7-Seater", "12-Seater"],
        default: "5-Seater",
      },
      price: {
        type: Number,
      },
      quantity: {
        type: Number,
        default: 1,
      },
    },
    hotelType: {
      name: {
        type: String,
        enum: ["1", "2", "3", "4", "5"],
        default: "3",
      },
      roomType: {
        type: String,
        enum: ["Quad", "Triple", "Double"],
        default: "Double",
      },
      price: {
        type: Number,
      },
      quantity: {
        type: Number,
        default: 1,
      },
    },
    mealType: {
      name: {
        type: String,
        enum: ["Veg", "NonVeg", "Jain"],
        default: "Veg",
      },
      price: {
        type: Number,
      },
    },
    tourGuide: {
      name: {
        type: String,
        enum: ["Male", "Female", "None"],
        default: "None",
      },
      price: {
        type: Number,
      },
    },
    finalPrice: {
      type: Number,
      required: true,
    },
    doorToDoor: {
      type: Boolean,
      default: false,
    },
    city: [
      {
        name: {
          type: String,
        },
      },
    ],
    activities: [
      {
        name: {
          type: String,
        },
        price: {
          type: Number,
        },
      },
    ],
    tourGuide: [
      {
        name: {
          type: String,
        },
        price: {
          type: Number,
        },
      },
    ],
    paidPrice: {
      type: Number,
      default: 0,
    },
    paymentInfo: {
      orderId: String,
      paymentId: String,
      signature: String,
      status: {
        type: String,
        enum: ["Pending", "Paid", "Failed", "Partial"],
        default: "Pending",
      },
    },
    bookingStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export const CustomizedBookings = mongoose.model(
  "CustomizedBookings",
  customizedBookingSchema
);
