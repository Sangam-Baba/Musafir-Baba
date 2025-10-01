import mongoose from "mongoose";

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
      type: String,
    },
  ],
  exclude: [
    {
      type: String,
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
  if (this.isModified("slug")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});
export const Membership = mongoose.model("Membership", membershipSchema);
