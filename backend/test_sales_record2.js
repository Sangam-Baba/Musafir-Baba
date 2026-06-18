import mongoose from "mongoose";
import { Staff } from "./src/models/Staff.js";
import { User } from "./src/models/User.js";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const staff = await Staff.findById('6a1ab9bb92dd4d59ba0ba6e3');
  const user = await User.findById('6a1ab9bb92dd4d59ba0ba6e3');
  console.log("In Staff:", !!staff);
  console.log("In User:", !!user);
  process.exit(0);
});
