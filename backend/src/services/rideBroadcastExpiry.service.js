import cron from "node-cron";
import { RideBooking } from "../models/RideBooking.js";

// Flags rides whose auto-broadcast window (see getBroadcastExpiry in
// ride.controller.js) has passed without any partner accepting, so they
// surface for admin attention. Does NOT change ride status or cancel
// anything -- a partner can still self-accept an AWAITING_ASSIGNMENT ride
// at any time; this only stops treating it as "still actively broadcasting."
export const startRideBroadcastExpiryCron = () => {
  // Runs every minute
  cron.schedule(
    "* * * * *",
    async () => {
      try {
        const now = new Date();

        const result = await RideBooking.updateMany(
          {
            status: "AWAITING_ASSIGNMENT",
            needsManualAssignment: false,
            broadcastExpiresAt: { $lte: now },
          },
          {
            $set: { needsManualAssignment: true },
          }
        );

        if (result.modifiedCount > 0) {
          console.log("Ride broadcast expiry cron executed", {
            flaggedCount: result.modifiedCount,
          });
        }
      } catch (error) {
        console.log("Ride broadcast expiry cron failed", {
          error: error.message,
        });
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );
};
