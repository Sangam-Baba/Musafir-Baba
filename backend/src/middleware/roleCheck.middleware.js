import { Staff } from "../models/Staff.js";
import { User } from "../models/User.js";

const ROUTE_PERMISSION_MAP = {
  "/api/packages": "holidays",
  "/api/category": "category",
  "/api/booking": "bookings",
  "/api/destinationseo": "destination-seo",
  "/api/destination": "destination",
  "/api/blogs": "blogs",
  "/api/authors": "authors",
  "/api/contact": "enquiry",
  "/api/news": "news",
  "/api/footer": "footer",
  "/api/visa-application": "visa-application",
  "/api/visa": "visa",
  "/api/webpage": "webpage",
  "/api/membership": "membership",
  "/api/jobapplication": "career",
  "/api/job": "career",
  "/api/aboutus": "about-us",
  "/api/customizedtourpackage": "customized-tour-package",
  "/api/media": "gallery",
  "/api/videobanner": "video-banner",
  "/api/coupan": "coupon",
  "/api/newsletter": "newsletter",
  "/api/vehicle": "vehicle",
  "/api/invoice": "invoice",
  "/api/attendance": "attendance",
  "/api/audit": "dashboard",
  "/api/master-data/brand": "master-vehicle-brand",
  "/api/master-data/type": "master-vehicle-type",
  "/api/master-data/pickup-destination": "master-pickup-destination",
  "/api/master-data/fuel-type": "master-fuel-type",
  "/api/master-data/transmission": "master-transmission",
  "/api/master-data/visa-type": "master-visa-type",
  "/api/master-data/visa-validity": "master-visa-validity",
  "/api/master-data/visa-duration": "master-visa-duration",
  "/api/master-data/visa-rejection-reasons": "master-visa-rejection",
  "/api/master-data/visa-expert-tips": "master-visa-rejection",
  "/api/sales-person": "master-sales-person",
  "/api/admin/update-password": "change-password",
  "/api/admin": "role"
};

const authorizedRoles = (roles, permission = null) => {
  return async (req, res, next) => {
    try {
      const id = req.user.sub;
      const role = req.user.role;

      let user;
      if (role === "admin" || role === "superadmin" || role === "staff") {
        user = await Staff.findById(id).select("role permissions");
      } else {
        user = await User.findById(id).select("role");
      }

      if (!user || !user.role) {
        return res.status(404).json({ message: "User not found" });
      }

      // 1. Check if the user's role is directly authorized
      if (roles.includes(user.role)) {
        return next();
      }

      // 2. If user is staff, check for specific module permission
      let permissionToCheck = permission;
      
      // Auto-infer permission from URL if not explicitly provided
      if (!permissionToCheck && req.originalUrl) {
        const urlPath = req.originalUrl.split('?')[0];
        const sortedKeys = Object.keys(ROUTE_PERMISSION_MAP).sort((a, b) => b.length - a.length);
        for (const key of sortedKeys) {
          if (urlPath.startsWith(key)) {
            permissionToCheck = ROUTE_PERMISSION_MAP[key];
            break;
          }
        }
      }

      if (user.role === "staff" && permissionToCheck && user.permissions?.includes(permissionToCheck)) {
        return next();
      }

      return res.status(403).json({ message: "You are not allowed" });
    } catch (error) {
      console.log("Role check failed: ", error.message);
      return res
        .status(500)
        .json({ message: "Server Error", error: error.message });
    }
  };
};

export default authorizedRoles;
