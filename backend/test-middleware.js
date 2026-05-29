import authorizedRoles from "./src/middleware/roleCheck.middleware.js";

const req = {
  user: { sub: "123", role: "staff" },
  originalUrl: "/api/attendance/check-in"
};
const res = {
  status: (code) => ({ json: (data) => console.log("Status:", code, "Data:", data) })
};
const next = () => console.log("Next called!");

// Mock Staff and User
import mongoose from "mongoose";
import { Staff } from "./src/models/Staff.js";
Staff.findById = () => ({
  select: () => ({ role: "staff", permissions: ["attendance"] })
});

const middleware = authorizedRoles(["admin", "superadmin", "staff"]);
middleware(req, res, next).catch(console.error);
