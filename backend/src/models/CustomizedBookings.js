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
      fixed: {
        startDate: { type: Date },
        endDate: { type: Date },
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
      type: String,
      enum: ["Veg", "Non-Veg", "Jain"],
      default: "Veg",
    },
    turGuide: {
      type: String,
      enum: ["Male", "Female", "None"],
      default: "None",
    },
    finalPrice: {
      type: Number,
      required: true,
    },
    doorToDoor: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const CustomizedBookings = mongoose.model(
  "CustomizedBookings",
  customizedBookingSchema
);
