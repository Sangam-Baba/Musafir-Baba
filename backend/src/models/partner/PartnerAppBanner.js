import mongoose from "mongoose";

// MBConnect partner app: Home carousel banners, managed from admin
// (Connect App Home). Separate collection from MBGO's AppBanner.
// Images are full designed banners, 1600x800 (2:1) WebP, resized in the
// admin browser before upload -- same size as the Home name banner.
export const PARTNER_BANNER_SCREENS = ["WALLET", "REFER_EARN", "BOOKINGS", "EARNINGS", "DOCUMENTS", "VEHICLES", "SUPPORT", "INBOX"];

const partnerAppBannerSchema = new mongoose.Schema(
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
      screen: { type: String, enum: [...PARTNER_BANNER_SCREENS, null], default: null },
      url: { type: String, trim: true },
    },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    startAt: { type: Date },
    endAt: { type: Date },
  },
  { timestamps: true }
);

export const PartnerAppBanner = mongoose.model("PartnerAppBanner", partnerAppBannerSchema);
