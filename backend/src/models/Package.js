import mongoose from "mongoose";
import slugify from "slugify";

const packageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 300, trim: true },
    description: { type: String },
    slug: { type: String, unique: true, index: true },

    destination: {
       type:mongoose.Schema.Types.ObjectId,
       ref:'Destination',
       required:true,
    },

    coverImage: { 
        url: String,
        alt: String,
        public_id: String,
        width: Number,
        height: Number
     },
    gallery: [{
        url: String,
        alt: String,
        public_id: String,
        width: Number,
        height: Number
    }],
    duration: {
      days: { type: Number, required: true },
      nights: { type: Number, required: true },
    },
    batch:[
        {
            startDate: { type: Date, required: true },
            endDate: { type: Date, required: true },
            quad: { type: Number, required: true },
            quadDiscount: { type: Number },
            triple: { type: Number, required: true },
            tripleDiscount: { type: Number },
            double: { type: Number, required: true },
            doubleDiscount: { type: Number },
            child: { type: Number, required: true },
            childDiscount: { type: Number },
        },
    ],
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    canonicalUrl: {
      type: String,
    },
    schemaType: {
      type: String,
    },
    maxPeople: Number,

    highlights: [String],
    inclusions: [String],
    exclusions: [String],
    faqs: [
      {
        question: { type: String},
        answer: { type: String },
      },
    ],
    itinerary: [
      {
        title: { type: String},
        description: { type: String },
      },
    ],

    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
  },
  { timestamps: true }
);

packageSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

export const Package = mongoose.model("Package", packageSchema);
