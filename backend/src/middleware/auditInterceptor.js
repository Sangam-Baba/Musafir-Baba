import crypto from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import auditEmitter from "../services/audit.service.js";

export const auditContext = new AsyncLocalStorage();

/**
 * Middleware to inject `req.logAction()` into the request object.
 * Extracts metadata (IP, User Agent) automatically.
 */
export const auditInterceptor = (req, res, next) => {
  // Generate a trace ID for this request if we want to trace multiple logs per request
  const requestId = crypto.randomUUID();
  const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  req.logAction = (payload) => {
    // Only log if a user is authenticated
    if (!req.user) {
      console.warn("req.logAction: NO REQ.USER FOUND! Make sure the route has authMiddleware.");
      return;
    }

    const userId = req.user._id || req.user.sub || req.user.id;
    if (!userId) {
      console.warn("req.logAction: No user ID found on req.user:", req.user);
      return;
    }

    console.log("req.logAction: Emitting log for action:", payload.actionType, payload.moduleName);
    
    auditEmitter.emit("log", {
      userId: userId,
      userName: req.user.name || req.user.email || req.user.username || "Staff User",
      role: req.user.role || "User",
      actionType: payload.actionType,
      moduleName: payload.moduleName,
      entityId: payload.entityId,
      documentTitle: payload.documentTitle || "N/A",
      description: payload.description,
      changes: (payload.oldValue || payload.newValue) ? { oldValue: payload.oldValue, newValue: payload.newValue } : undefined,
      metadata: {
        ipAddress,
        userAgent,
        requestId,
      },
    });
  };

  auditContext.run(req, () => {
    next();
  });
};
