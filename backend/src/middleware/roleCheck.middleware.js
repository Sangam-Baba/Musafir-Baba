import { User } from "../models/User.js";
import { Staff } from "../models/Staff.js";
const authorizedRoles = ([...roles]) => {
  return async (req, res, next) => {
    try {
      const id = req.user.sub;
      const role = req.user.role;
      let user;
      if (role === "admin") {
        user = await Staff.findById(id).select("role");
      } else {
        user = await User.findById(id).select("role");
      }
      if (!user || !user.role)
        return res.status(404).json({ message: "User not found" });
      if (!roles.includes(user.role)) {
        return res.status(403).json({ message: "You are not allowed" });
      }
      next();
    } catch (error) {
      console.log("Role check failed: ", error.message);
      return res
        .status(500)
        .json({ message: "Server Error", error: error.message });
    }
  };
};

export default authorizedRoles;
