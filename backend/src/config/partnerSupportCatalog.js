// Help categories for MBConnect driver-partner tickets (service "PARTNER").
export const PARTNER_SUPPORT_SERVICE = { key: "PARTNER", label: "Driver Partner" };
export const PARTNER_SUPPORT_ISSUES = [
  { key: "TRIP", label: "Trip issue" },
  { key: "PAYMENT", label: "Payment / payout" },
  { key: "ACCOUNT", label: "Account & verification" },
  { key: "VEHICLE", label: "Vehicle & documents" },
  { key: "RIDER", label: "Rider behaviour" },
  { key: "APP", label: "App problem" },
  { key: "OTHER", label: "Something else" },
];
export const findPartnerIssue = (key) => PARTNER_SUPPORT_ISSUES.find((i) => i.key === key) || null;
