import mongoose from "mongoose";

// Help & Support tickets raised by riders from the MBGo app (new collection).
const attachmentSchema = new mongoose.Schema({ url: String, key: String, format: String, size: Number }, { _id: false });

const messageSchema = new mongoose.Schema(
  {
    from: { type: String, enum: ["RIDER", "ADMIN", "PARTNER"], required: true },
    text: { type: String, trim: true, maxlength: 2000 },
    attachments: { type: [attachmentSchema], default: [] },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    staffName: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  { status: String, note: String, by: { type: String, enum: ["RIDER", "ADMIN", "SYSTEM", "PARTNER"] }, at: { type: Date, default: Date.now } },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, unique: true, index: true }, // "MBGT000123"
    // Rider tickets (MBGO) have riderId; driver-partner tickets (MBConnect) have partnerId instead.
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "RiderProfile", required: function () { return !this.partnerId; }, index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "PartnerProfile", index: true },
    subject: { type: String, trim: true, maxlength: 150 },
    service: { type: String, required: true, index: true },
    serviceLabel: { type: String },
    issueKey: { type: String, required: true },
    issueLabel: { type: String },
    quickOptions: { type: [String], default: [] },
    description: { type: String, trim: true, maxlength: 2000, required: true },
    attachments: { type: [attachmentSchema], default: [] },
    // Snapshot of the booking the ticket is about (optional).
    booking: {
      kind: { type: String, enum: ["RIDE", "TOUR", "VISA"] },
      id: { type: mongoose.Schema.Types.ObjectId },
      code: String,
      title: String,
      subtitle: String,
      status: String,
    },
    preferredContact: {
      method: { type: String, enum: ["CALL", "WHATSAPP", "EMAIL"], default: "CALL" },
      value: String,
    },
    expectedResolution: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"], default: "OPEN", index: true },
    priority: { type: String, enum: ["LOW", "NORMAL", "HIGH", "URGENT"], default: "NORMAL", index: true },
    resolutionNote: { type: String, trim: true, maxlength: 2000 },
    messages: { type: [messageSchema], default: [] },
    statusHistory: { type: [statusHistorySchema], default: [] },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    riderUnread: { type: Boolean, default: false }, // admin replied, rider hasn't opened yet
    adminUnread: { type: Boolean, default: true }, // rider wrote, admin hasn't opened yet
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export const SupportTicket = mongoose.models.SupportTicket || mongoose.model("SupportTicket", supportTicketSchema);
