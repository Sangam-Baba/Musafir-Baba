import mongoose from "mongoose";
import { Visa } from "./src/models/Visa.js";
import dotenv from "dotenv";

dotenv.config();

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/musafir-baba");
    console.log("Connected to MongoDB");

    // Replace this ID with an existing Visa ID, or just find one
    const visaId = "68dac24d1f905d0dde60b74e";
    const visa = await Visa.findById(visaId);
    if (!visa) {
      console.log("No visa found with that ID");
      process.exit(1);
    }

    console.log(`Updating Visa: ${visa._id}`);
    
    // Attempt an update similar to what happens in the controller
    const updated = await Visa.findByIdAndUpdate(
      visa._id,
      { $set: { title: "Test Update Title 2" } },
      { new: true, runValidators: true }
    );
    console.log("Update successful");
  } catch (error) {
    console.error("Error during update:", error);
  } finally {
    mongoose.disconnect();
  }
};

runTest();
