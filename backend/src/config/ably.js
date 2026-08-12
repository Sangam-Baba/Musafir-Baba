import Ably from "ably";
import dotenv from "dotenv";

dotenv.config();

// Constructed lazily (not at import time) so the server can still boot
// normally when ABLY_API_KEY hasn't been configured yet -- realtime
// notifications simply won't be available until it is, everything else
// keeps working. See notificationService.js, which already treats a
// failed publish as non-fatal.
let ablyRest = null;

const getAblyRest = () => {
  if (!process.env.ABLY_API_KEY) {
    throw new Error("ABLY_API_KEY is not set -- realtime notifications are unavailable");
  }
  if (!ablyRest) {
    ablyRest = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  }
  return ablyRest;
};

export default getAblyRest;
