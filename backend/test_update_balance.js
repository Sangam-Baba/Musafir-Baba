import mongoose from "mongoose";
import { Staff } from "./src/models/Staff.js";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to DB");
    
    // Find test 4 user
    const testUser = await Staff.findOne({ name: { $regex: /test/i } });
    if(testUser) {
        console.log("Found user:", testUser.name, testUser.email);
        testUser.availableLeaveBalance = 10;
        testUser.availableShortLeaveBalance = 10;
        await testUser.save();
        console.log("Updated balances to 10.");
    } else {
        const users = await Staff.find({}, 'name email');
        console.log("No test user found. All users:", users);
    }
    
    process.exit(0);
  })
  .catch(console.error);
