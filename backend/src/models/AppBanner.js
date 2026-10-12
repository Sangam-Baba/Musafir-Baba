import mongoose from "mongoose";

// MBGo rider app: Home carousel banners, managed from admin (new collection).
// Images are full designed banners, 1200x400 WebP, resized in the admin
// browser before upload.
export const BANNER_SCREENS = ["TOURS", "VISA", "CAB", "SUPPORT", "NOTIFICATIONS"];

const appBannerSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 120, required: true }, // admin label + alt text
    image: {
      url: { type: String, required: true },
      key: String,
      width: Number,
      height: Number,
      size: Number, // bytes
    },
    action: {
      type: { type: String, enum: ["NONE", "SCREEN", "URL"], default: "NONE" },
      screen: { type: String, enum: [...BANNER_SCREENS, null], default: null },
      url: { type: String, trim: true },
    },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    startAt: { type: Date },
    endAt: { type: Date },
  },
  { timestamps: true }
);

export const AppBanner = mongoose.model("AppBanner", appBannerSchema);
