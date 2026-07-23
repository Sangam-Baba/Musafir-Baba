import mongoose from "mongoose";
import slugify from "slugify";

const vehicleSchema = new mongoose.Schema(
  {
    vehicleName: {
      type: String,
      trim: true,
      required: true,
    },
    vehicleType: {
      type: String,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehiclePickUpDestination",
    },
    vehicleYear: String,
    vehicleBrand: {
      type: String,
    },
    convenienceFee: {
      type: Number,
    },
    tripProtectionFee: {
      type: Number,
    },
    vehicleTransmission: {
      type: String,
      // enum: ["manual", "automatic", "mannual"], // removing strict enum to allow master data values
      default: "manual",
    },
    vehicleModel: {
      type: String,
    },
    vehicleMilage: {
      type: String,
    },
    fuelType: {
      type: String,
      // enum: ["electric", "petrol", "diesel", "cng", "other"], // removing strict enum to allow master data values
      default: "petrol",
    },
    features: [String],
    seats: Number,
    price: {
      daily: Number,
      hourly: Number,
    },
    seatingOptions: [
      {
        seats: Number,
        dailyPrice: Number,
        hourlyPrice: Number,
        stock: {
          type: Number,
          default: 1,
        },
      },
    ],
    pricingType: {
      type: String,
      enum: ["single", "multiple"],
      default: "single",
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    content: String,
    availableStock: {
      type: Number,
      default: 1,
    },
    gallery: [
      {
        url: String,
        alt: String,
        title: String,
        width: Number,
        height: Number,
      },
    ],
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
    excerpt: String,
    keywords: [String],
    inclusions: [String],
    exclusions: [String],
    faqs: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
    vehicleAtAGlance: { type: String },
    quickAnswers: { type: String },
    availableFor: { type: String },
    rentalOptions: { type: String },
    howBookingWorks: { type: String },
    helpfulResources: [
      {
        title: String,
        url: String,
      },
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Author",
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
  },
  { timestamps: true },
);

vehicleSchema.pre("save", async function (next) {
  if (!this.slug || this.isModified("slug")) {
    this.slug = slugify(this.slug || this.title, { lower: true, strict: true });
  }
  
  if (!this.canonicalUrl) {
    let locSlug = "";
    if (this.location) {
      const loc = await mongoose.model("VehiclePickUpDestination").findById(this.location).lean();
      if (loc) locSlug = loc.slug;
    }
    const vType = this.vehicleType ? slugify(this.vehicleType, { lower: true }) : "car";
    this.canonicalUrl = `/rental/${vType}${locSlug ? '/' + locSlug : ''}/${this.slug}`;
  }
  next();
});

vehicleSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  const existindDoc = await this.model.findOne(this.getQuery()).lean();

  if (existindDoc) {
    if (update.slug) {
      update.slug = slugify(update.slug || update.title || existindDoc.title, {
        lower: true,
        strict: true,
      });
    } else if (update.title && !update.slug) {
      update.slug = slugify(update.title, {
        lower: true,
        strict: true,
      });
    }

    const finalSlug = update.slug ? update.slug : existindDoc.slug;

    const changeCanonical =
      update.canonicalUrl && update.canonicalUrl !== existindDoc.canonicalUrl;
    const changeSlug = update.slug && update.slug !== existindDoc.slug;
    const changeLocation = update.location && String(update.location) !== String(existindDoc.location);
    const changeType = update.vehicleType && update.vehicleType !== existindDoc.vehicleType;
    
    if (!changeCanonical || changeSlug || changeLocation || changeType) {
      let locId = update.location || existindDoc.location;
      let locSlug = "";
      if (locId) {
        const loc = await mongoose.model("VehiclePickUpDestination").findById(locId).lean();
        if (loc) locSlug = loc.slug;
      }
      let vTypeRaw = update.vehicleType || existindDoc.vehicleType || "car";
      let vType = slugify(vTypeRaw, { lower: true });
      update.canonicalUrl = `/rental/${vType}${locSlug ? '/' + locSlug : ''}/${finalSlug}`;
    }
  }

  this.setUpdate(update);
  next();
});

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);
