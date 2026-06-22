import mongoose from "mongoose";

const knowledgeBaseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["visa", "package", "destination", "blog", "faq", "policy", "contact", "rental"],
      required: true,
    },
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
    content: {
      type: String,
      required: true,
    },
    url: {
      type: String,
    },
    relatedQuestions: [
      {
        type: String,
      },
    ],
    priority: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Create a text index on title, keywords, and content for MongoDB Native Text Search
knowledgeBaseSchema.index(
  { title: "text", keywords: "text", content: "text" },
  {
    weights: {
      title: 10,
      keywords: 5,
      content: 1,
    },
    name: "TextIndex",
  }
);

export default mongoose.model("KnowledgeBase", knowledgeBaseSchema);
