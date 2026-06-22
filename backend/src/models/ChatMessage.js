import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ["user", "bot"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    url: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index to easily fetch history for a session
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", chatMessageSchema);
