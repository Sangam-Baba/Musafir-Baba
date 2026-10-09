import jwt from "jsonwebtoken";
import RiderAuth from "../models/rider/RiderAuth.js";

export const isRiderAuthenticated = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Fallback to cookie if available
    else if (req.cookies && req.cookies.rider_token) {
      token = req.cookies.rider_token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Not Authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || "fallback_secret");

    if (decoded.role !== "Rider") {
      return res.status(403).json({ success: false, message: "Forbidden: Not a Rider" });
    }

    // A deleted account's still-valid token must not keep working.
    const account = await RiderAuth.findById(decoded.riderId).select("status").lean();
    if (account && account.status === "Deleted") {
      return res.status(401).json({ success: false, message: "This account has been deleted. Contact support." });
    }

    // Attach riderId to request
    req.riderId = decoded.riderId;
    next();
  } catch (error) {
    console.error("Rider Auth Middleware Error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
