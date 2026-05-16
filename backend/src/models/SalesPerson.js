import mongoose from "mongoose";

const salesPersonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    salesId: {
      type: String,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to generate MBSL00001 style ID
salesPersonSchema.pre("save", async function (next) {
  if (!this.salesId) {
    const lastPerson = await this.constructor
      .findOne({}, {}, { sort: { createdAt: -1 } })
      .lean();

    let nextNumber = 1;
    if (lastPerson && lastPerson.salesId) {
      const lastIdMatch = lastPerson.salesId.match(/\d+$/);
      if (lastIdMatch) {
        nextNumber = parseInt(lastIdMatch[0], 10) + 1;
      }
    }

    this.salesId = `MBSL${nextNumber.toString().padStart(5, "0")}`;
  }
  next();
});

export const SalesPerson = mongoose.model("SalesPerson", salesPersonSchema);
