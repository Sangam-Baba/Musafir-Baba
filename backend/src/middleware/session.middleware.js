import { Session } from "../models/AuthSession.js";
export const validateSession = async (req, res, next) => {
  const session = await Session.findOne({ sessionId: req.user?.sessionId });

  if (!session) {
    return res.status(401).json({ message: "Invalid session" });
  }

  if (session.status === "logout" || session.revoked) {
    return res.status(401).json({ message: "Session closed" });
  }

  // Update last activity for analytics
  session.lastSeen = new Date();
  await session.save();

  next();
};
