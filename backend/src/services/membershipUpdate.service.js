import cron from "node-cron";
import MembershipBooking from "../models/MembershipBooking.js";

export const startMembershipExpiryCron = () => {
  // Runs every day at 00:00 (server time)
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        const now = new Date();

        const result = await MembershipBooking.updateMany(
          {
            bookingStatus: "Active",
            endDate: { $lte: now },
          },
          {
            $set: {
              bookingStatus: "Expired",
              expiredAt: now,
              updatedAt: now,
            },
          }
        );

        console.log("Daily membership expiry cron executed", {
          expiredCount: result.modifiedCount,
        });
      } catch (error) {
        console.log("Daily membership expiry cron failed", {
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
