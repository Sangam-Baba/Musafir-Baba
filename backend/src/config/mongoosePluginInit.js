import mongoose from "mongoose";
import { auditPlugin } from "../middleware/auditPlugin.js";

// Apply the global audit plugin to all Mongoose models
// Exclude internal logs from tracking themselves
mongoose.plugin((schema, options) => {
  auditPlugin(schema, options);
});
