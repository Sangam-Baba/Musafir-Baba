// Cancellation reasons shown to riders (per service). Served to the app and
// used to validate requests, so labels match in the app and in Admin.
export const CANCELLATION_REASONS = {
  CAB: [
    { key: "PLANS_CHANGED", label: "My plans changed" },
    { key: "BOOKED_BY_MISTAKE", label: "Booked by mistake" },
    { key: "WRONG_DETAILS", label: "Wrong pickup, drop or time" },
    { key: "DRIVER_DELAYED", label: "Driver is late or not responding" },
    { key: "DRIVER_ASKED", label: "Driver asked me to cancel" },
    { key: "BETTER_OPTION", label: "Found a better option" },
    { key: "PRICE", label: "Price is too high" },
    { key: "OTHER", label: "Other" },
  ],
  TOUR: [
    { key: "PLANS_CHANGED", label: "Change in travel plans" },
    { key: "EMERGENCY", label: "Personal or family emergency" },
    { key: "HEALTH", label: "Health reasons" },
    { key: "DATES", label: "Dates don't suit me anymore" },
    { key: "BETTER_DEAL", label: "Found a better deal" },
    { key: "BOOKED_BY_MISTAKE", label: "Booked by mistake" },
    { key: "OTHER", label: "Other" },
  ],
  VISA: [
    { key: "TRIP_CANCELLED", label: "Trip cancelled or postponed" },
    { key: "NOT_NEEDED", label: "Visa no longer needed" },
    { key: "APPLYING_ELSEWHERE", label: "Applying myself / elsewhere" },
    { key: "DOCUMENTS", label: "Documents not available" },
    { key: "WRONG_VISA", label: "Chose the wrong visa type" },
    { key: "BOOKED_BY_MISTAKE", label: "Applied by mistake" },
    { key: "OTHER", label: "Other" },
  ],
};

export const findReason = (service, key) => (CANCELLATION_REASONS[service] || []).find((r) => r.key === key) || null;
