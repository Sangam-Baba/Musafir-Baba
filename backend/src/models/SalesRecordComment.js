import mongoose from "mongoose";

const salesRecordCommentSchema = new mongoose.Schema(
  {
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesRecord",
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "authorModel",
    },
    authorModel: {
      type: String,
      required: true,
      enum: ["Staff", "User"], // Just in case superadmin acts as a User, but usually it's Staff
      default: "Staff",
    },
    content: {
      type: String,
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesRecordComment",
      default: null, // If null, it's a top-level comment. Otherwise, it's a reply.
    },
  },
  { timestamps: true }
);

export const SalesRecordComment = mongoose.model(
  "SalesRecordComment",
  salesRecordCommentSchema
);
