import mongoose from "mongoose";

const coupanSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      uppercase: true,
      required: true,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: ["FLAT", "PERCENTAGE"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    minAmount: { type: Number, default: 0 },

    maxDiscount: { type: Number }, // for % coupons

    applicableItems: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        itemType: {
          type: String,
          enum: ["CUSTOM_PACKAGE", "GROUP_PACKAGE", "VISA"],
          required: true,
        },
      },
    ], // empty → all packages

    usageLimit: { type: Number }, // total uses
    usedCount: { type: Number, default: 0 },

    perUserLimit: { type: Number, default: 1 },

    validFrom: Date,
    validTill: Date,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Coupan = mongoose.model("Coupan", coupanSchema);
