import dotenv from "dotenv";
dotenv.config(); // ✅ Must be first — loads .env before anything reads process.env

import connectDb from "./config/db.js";
import app from "./app.js";
import { startMembershipExpiryCron } from "./services/membershipUpdate.service.js";

const PORT = process.env.PORT || 5000;

connectDb().then(() => {
  console.log("Database connected");
});

app.get("/", (req, res) => {
  res.send("Server is running...");
});

// Start membership expiry cron
startMembershipExpiryCron();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
