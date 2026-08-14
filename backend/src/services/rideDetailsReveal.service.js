import cron from "node-cron";
import { RideBooking } from "../models/RideBooking.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import { isWithin24h } from "../controllers/ride.controller.js";
import { notifyUser } from "./notification/notificationService.js";

const ASSIGNED_STATUSES = ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING"];

// Fires the one-time "driver & vehicle / rider contact details are now
// available" notification once a ride crosses the reveal window (see
// isWithin24h / isDetailsRevealed in ride.controller.js). Gating itself is
// always computed live by the API endpoints -- this cron only handles the
// proactive notification, and only for rides that were still gated at
// acceptance time (acceptRide already marks detailsRevealNotified true
// immediately when a ride is accepted less than 24h out, so this never
// double-notifies).
export const startRideDetailsRevealCron = () => {
  // Runs every minute
  cron.schedule(
    "* * * * *",
    async () => {
      try {
        const candidates = await RideBooking.find({
          status: { $in: ASSIGNED_STATUSES },
          detailsRevealNotified: { $ne: true },
        });

        let revealedCount = 0;

        for (const ride of candidates) {
          if (!isWithin24h(ride)) continue;

          const [riderProfile, partnerProfile] = await Promise.all([
            RiderProfile.findById(ride.rider),
            PartnerProfile.findById(ride.assignedPartnerId),
          ]);

          if (riderProfile) {
            await notifyUser({
              recipientType: "Rider",
              recipientId: riderProfile._id,
              title: "Driver details available",
              message: "Your driver & vehicle details are now available for your upcoming trip.",
              type: "Trip",
              data: { rideId: ride._id },
              pushToken: riderProfile.pushToken,
            });
          }

          if (partnerProfile) {
            await notifyUser({
              recipientType: "Partner",
              recipientId: partnerProfile._id,
              title: "Rider details available",
              message: "Rider contact details are now available for your upcoming trip.",
              type: "Trip",
              data: { rideId: ride._id },
              pushToken: partnerProfile.pushToken,
            });
          }

          ride.detailsRevealNotified = true;
          await ride.save();
          revealedCount += 1;
        }

        if (revealedCount > 0) {
          console.log("Ride details reveal cron executed", { revealedCount });
        }
      } catch (error) {
        console.log("Ride details reveal cron failed", {
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
