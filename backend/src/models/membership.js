import mongoose from "mongoose";
import slugify from "slugify";
const membershipSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    trim: true,
  },
  duration: {
    type: String,
    enum: ["quaterly", "half-yearly", "yearly"],
    required: true,
  },
  include: [
    {
      item: String,
    },
  ],
  exclude: [
    {
      item: String,
    },
  ],
  slug: {
    type: String,
    unique: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

membershipSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});
export const Membership = mongoose.model("Membership", membershipSchema);
