import dotenv from "dotenv";
dotenv.config(); // ✅ Must be first — loads .env before anything reads process.env

import "./config/mongoosePluginInit.js"; // Attach global database Audit tracker

import connectDb from "./config/db.js";
import app from "./app.js";
import { startMembershipExpiryCron } from "./services/membershipUpdate.service.js";
import { startRideBroadcastExpiryCron } from "./services/rideBroadcastExpiry.service.js";
import { startRideDetailsRevealCron } from "./services/rideDetailsReveal.service.js";

const PORT = process.env.PORT || 5000;

connectDb().then(() => {
  console.log("Database connected");
});

app.get("/", (req, res) => {
  res.send("Server is running...");
});

// Start membership expiry cron
startMembershipExpiryCron();

// Start ride broadcast expiry cron
startRideBroadcastExpiryCron();

// Start ride details reveal cron
startRideDetailsRevealCron();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
