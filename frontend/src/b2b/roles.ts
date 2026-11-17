// Readable names for role keys (system roles); custom roles carry their own names.
const ROLE_NAMES: Record<string, string> = {
  "client.owner": "Owner",
  "client.admin": "Admin",
  "client.bookingAgent": "Booking Agent",
  "client.accountant": "Accountant",
  "client.viewer": "Viewer",
  "hotel.owner": "Owner",
  "hotel.manager": "Manager",
  "hotel.frontDesk": "Front Desk",
};
export const roleName = (ref: string) => ROLE_NAMES[ref] ?? (ref.startsWith("custom:") ? "Custom role" : ref);
