// Help & Support catalogue: services, their issue types and quick options.
// Served to the app (GET /api/support/catalog) and used to validate tickets,
// so labels stay identical in the app and in Admin.

export const SUPPORT_SERVICES = [
  {
    key: "CAB", label: "Cabs", subtitle: "City & Outstation", bookingKind: "RIDE",
    issues: [
      { key: "DRIVER_NOT_ARRIVED", label: "Driver not arrived", hint: "Driver is delayed or not at pickup location", quick: ["Driver is late", "Cannot contact driver", "Driver at wrong location"] },
      { key: "DRIVER_CANCELLED", label: "Driver cancelled", hint: "Driver cancelled the ride or asked for extra charges", quick: ["Cancelled after accepting", "Asked to cancel", "Asked for extra money"] },
      { key: "FARE_PAYMENT", label: "Fare/Payment issue", hint: "Incorrect fare, double charge or refund", quick: ["Charged twice", "Fare higher than shown", "Refund not received"] },
      { key: "TRIP_CHANGES", label: "Trip changes", hint: "Change pickup, drop or route during the trip", quick: ["Change pickup", "Change drop", "Change date/time"] },
      { key: "EXTRA_CHARGES", label: "Extra charges", hint: "Toll, parking or waiting charges related issue", quick: ["Toll / parking", "Waiting charges", "Night charges"] },
      { key: "VEHICLE_ISSUE", label: "Vehicle issue", hint: "Vehicle not as expected or poor condition", quick: ["Different vehicle", "AC not working", "Not clean"] },
      { key: "DRIVER_BEHAVIOUR", label: "Driver behaviour", hint: "Unprofessional behaviour or safety concern", quick: ["Rude behaviour", "Rash driving", "Felt unsafe"] },
      { key: "LOST_ITEM", label: "Lost item", hint: "Item left in vehicle and need help to recover", quick: ["Bag", "Phone", "Wallet / documents"] },
      { key: "OTHER", label: "Something else", hint: "Describe your problem in your own words", quick: [] },
    ],
  },
  {
    key: "TOUR", label: "Tours", subtitle: "Holiday Packages", bookingKind: "TOUR",
    issues: [
      { key: "BOOKING_CHANGE", label: "Change booking", hint: "Dates, travellers or room sharing", quick: ["Change dates", "Add/remove traveller", "Change room sharing"] },
      { key: "CANCELLATION", label: "Cancellation & refund", hint: "Cancel the trip or refund status", quick: ["Cancel booking", "Refund status"] },
      { key: "PAYMENT", label: "Payment issue", hint: "Balance payment, failed or double charge", quick: ["Pay balance", "Payment failed", "Charged twice"] },
      { key: "ITINERARY", label: "Itinerary & inclusions", hint: "Hotels, meals, sightseeing or pickup", quick: ["Hotel details", "Pickup point", "What's included"] },
      { key: "ON_TRIP", label: "Issue during the trip", hint: "Hotel, transport or guide problem", quick: ["Hotel problem", "Transport problem", "Guide problem"] },
      { key: "OTHER", label: "Something else", hint: "Any other question about your tour", quick: [] },
    ],
  },
  {
    key: "VISA", label: "Visa", subtitle: "Visa Assistance", bookingKind: "VISA",
    issues: [
      { key: "STATUS", label: "Application status", hint: "Where is my visa application?", quick: ["Taking too long", "Status not updated"] },
      { key: "DOCUMENTS", label: "Documents", hint: "Which documents, re-upload or returned application", quick: ["Re-upload a document", "Document requirements", "Application returned"] },
      { key: "PAYMENT", label: "Payment & refund", hint: "Fee, failed payment or refund", quick: ["Payment failed", "Charged twice", "Refund"] },
      { key: "CHANGE_DETAILS", label: "Change details", hint: "Traveller name, dates or visa type", quick: ["Name correction", "Travel date change", "Visa type change"] },
      { key: "OTHER", label: "Something else", hint: "Any other visa question", quick: [] },
    ],
  },
  {
    key: "PAYMENT", label: "Payments", subtitle: "Charges & Refunds", bookingKind: null,
    issues: [
      { key: "REFUND", label: "Refund not received", hint: "Refund is pending or delayed", quick: [] },
      { key: "DOUBLE_CHARGE", label: "Charged twice", hint: "Money deducted more than once", quick: [] },
      { key: "FAILED", label: "Payment failed, money deducted", hint: "Booking not confirmed but money gone", quick: [] },
      { key: "INVOICE", label: "Invoice / GST bill", hint: "Need an invoice or GST details", quick: [] },
      { key: "OTHER", label: "Something else", hint: "Describe your problem in your own words", quick: [] },
    ],
  },
  {
    key: "SAFETY", label: "Safety", subtitle: "Complaints & Issues", bookingKind: "RIDE",
    issues: [
      { key: "UNSAFE", label: "Felt unsafe", hint: "Report a safety concern", quick: [] },
      { key: "HARASSMENT", label: "Harassment", hint: "Report harassment or misbehaviour", quick: [] },
      { key: "ACCIDENT", label: "Accident", hint: "Report an accident", quick: [] },
      { key: "OTHER", label: "Something else", hint: "Describe your problem in your own words", quick: [] },
    ],
  },
  {
    key: "FLIGHT", label: "Flights", subtitle: "Domestic & Intl.", bookingKind: null,
    issues: [{ key: "GENERAL", label: "Help with a flight booking", hint: "Booked through the Flight option", quick: [] }],
  },
  {
    key: "TRAIN", label: "Trains", subtitle: "IRCTC & Partner", bookingKind: null,
    issues: [{ key: "GENERAL", label: "Help with a train booking", hint: "Booked through the Train option", quick: [] }],
  },
  {
    key: "HOTEL", label: "Hotels", subtitle: "Stay Bookings", bookingKind: null,
    issues: [{ key: "GENERAL", label: "Help with a hotel booking", hint: "Booked through the Hotel option", quick: [] }],
  },
  {
    key: "OTHER", label: "Others", subtitle: "Account & app", bookingKind: null,
    issues: [
      { key: "ACCOUNT", label: "Account & login", hint: "Profile, password or sign-in", quick: [] },
      { key: "APP", label: "App problem", hint: "Something isn't working in the app", quick: [] },
      { key: "FEEDBACK", label: "Feedback / suggestion", hint: "Tell us how to improve", quick: [] },
      { key: "OTHER", label: "Something else", hint: "Anything else", quick: [] },
    ],
  },
];

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
export const TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
export const CONTACT_METHODS = ["CALL", "WHATSAPP", "EMAIL"];
export const MAX_ATTACHMENTS = 5;

export const findService = (key) => SUPPORT_SERVICES.find((s) => s.key === key) || null;
export const findIssue = (service, issueKey) => (service?.issues || []).find((i) => i.key === issueKey) || null;
