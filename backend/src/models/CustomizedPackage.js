import mongoose from "mongoose";

const customizedPackageSchema = new mongoose.Schema(
  {
    title: String,
    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: true,
    },
    price: Number,
    city: [
      {
        name: String,
      },
    ],
    transport: [
      {
        vehicleType: {
          type: String,
          enum: ["5-Seater", "7-Seater", "12-Seater"],
          default: "5-Seater",
        },
        price: Number,
        maxPeople: Number,
      },
    ],
    hotel: [
      {
        star: {
          type: String,
          enum: ["1", "2", "3", "4", "5"],
          default: "3",
        },
        quadPrice: Number,
        triplePrice: Number,
        doublePrice: Number,
      },
    ],
    mealType: [
      {
        name: {
          type: String,
          enum: ["Veg", "NonVeg", "Jain"],
          default: "Veg",
        },
        price: Number,
      },
    ],
    activities: [
      {
        name: String,
        price: Number,
      },
    ],
    tourGuide: [
      {
        name: {
          type: String,
          enum: ["Male", "Female"],
          default: "Male",
        },
        price: Number,
      },
    ],
  },
  { timestamps: true }
);

export const CustomizedPackage = mongoose.model(
  "CustomizedPackage",
  customizedPackageSchema
);
