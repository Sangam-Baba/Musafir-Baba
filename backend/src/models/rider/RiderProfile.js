import mongoose from "mongoose";

const riderProfileSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RiderAuth",
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      default: "",
    },
    profilePicture: {
      type: String,
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    pushToken: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.RiderProfile ||
  mongoose.model("RiderProfile", riderProfileSchema);
