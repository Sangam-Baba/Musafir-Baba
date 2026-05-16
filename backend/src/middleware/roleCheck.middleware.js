import { Staff } from "../models/Staff.js";
import { User } from "../models/User.js";

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
      if (user.role === "staff" && permission && user.permissions?.includes(permission)) {
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
