import EventEmitter from "events";
import { AuditLog } from "../models/AuditLog.js";
import { Staff } from "../models/Staff.js";
import { User } from "../models/User.js";

// Singleton event emitter for application-wide logging
class AuditEmitter extends EventEmitter {}
const auditEmitter = new AuditEmitter();

// Keys to strip out of the changes payload (Sanitization)
const SENSITIVE_KEYS = ["password", "token", "refreshToken", "otp", "secret"];
// Heuristic: If a string exceeds this length, don't store it in the audit log to prevent DB bloat
const MAX_STRING_LENGTH = 1000;

/**
 * Sanitizes an object deeply to remove sensitive or huge fields.
 */
function sanitizePayload(rawPayload) {
  let payload = rawPayload;
  // If it's a Mongoose document or complex object, safely convert it to plain JSON first
  if (payload && typeof payload === "object" && typeof payload.toObject === "function") {
    try { payload = payload.toObject(); } catch(e) {}
  } else if (payload && typeof payload === "object") {
    try { payload = JSON.parse(JSON.stringify(payload)); } catch (e) {}
  }

  if (!payload || typeof payload !== "object") {
    if (typeof payload === "string" && payload.length > MAX_STRING_LENGTH) {
      return "[TRUNCATED LARGE TEXT]";
    }
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map(sanitizePayload);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizePayload(value);
    }
  }
  return sanitized;
}

// Background Listener for Logging
auditEmitter.on("log", async (payload) => {
  try {
    const {
      userId,
      userName,
      role,
      actionType,
      moduleName,
      entityId,
      documentTitle,
      description,
      changes,
      metadata,
    } = payload;

    // Fast return if essential fields are missing
    if (!userId || !userName || !actionType || !moduleName || !description) {
      console.warn("Audit log missing required fields. Skipping log creation.", { userId, userName, actionType, moduleName, description });
      return;
    }

    const sanitizedChanges = changes ? sanitizePayload(changes) : undefined;

    // Asynchronously resolve userName if it was not in the JWT token
    let resolvedUserName = userName;
    if (resolvedUserName === "Staff User" && userId) {
      const staff = await Staff.findById(userId).select("name email").lean();
      if (staff) {
        resolvedUserName = staff.name || staff.email;
      } else {
        const standardUser = await User.findById(userId).select("name email").lean();
        if (standardUser) {
          resolvedUserName = standardUser.name || standardUser.email;
        }
      }
    }

    await AuditLog.create({
      userId,
      userName: resolvedUserName || "Unknown User",
      role,
      actionType,
      moduleName,
      entityId,
      documentTitle,
      description,
      changes: sanitizedChanges,
      metadata,
    });
    console.log(`[AuditService] Successfully saved log for ${actionType} on ${moduleName}`);
  } catch (error) {
    // Fail silently in production to not disrupt the app, but log to console
    console.error("Failed to write audit log (async):", error.message, error);
  }
});

export default auditEmitter;
