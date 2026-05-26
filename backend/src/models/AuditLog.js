import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    userName: { type: String, required: true }, // Denormalized for fast reads
    role: { type: String },

    actionType: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "STATUS_CHANGE",
        "PERMISSION_CHANGE",
        "OTHER",
      ],
      required: true,
      index: true,
    },
    moduleName: { type: String, required: true, index: true }, // e.g., 'Blogs', 'Enquiries', 'Users'
    entityId: { type: mongoose.Schema.Types.ObjectId, index: true }, // The ID of the document affected
    documentTitle: { type: String, default: "N/A", index: true }, // The human-readable title/name of the record

    description: { type: String, required: true },
    changes: {
      oldValue: { type: mongoose.Schema.Types.Mixed },
      newValue: { type: mongoose.Schema.Types.Mixed },
    },

    metadata: {
      ipAddress: { type: String },
      userAgent: { type: String },
      requestId: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast Admin filtering by user
auditLogSchema.index({ userId: 1, createdAt: -1 });
// Compound index for filtering by module and action
auditLogSchema.index({ moduleName: 1, actionType: 1, createdAt: -1 });

// Auto-delete logs older than 6 months (approx 15552000 seconds) to save space
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
