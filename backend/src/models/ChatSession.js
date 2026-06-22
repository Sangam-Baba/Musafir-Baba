import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Null for anonymous users
    },
    currentState: {
      type: String,
      default: "IDLE", // Stores the state machine's current state (e.g., AWAITING_DESTINATION)
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Stores accumulated data during conversational flows (e.g., { destination: 'Dubai', budget: '50000' })
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ChatSession", chatSessionSchema);
