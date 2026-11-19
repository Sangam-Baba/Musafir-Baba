// Booking requests (D37): shapes shared by the client pages and the admin tab.
export type RequestStatus = "SUBMITTED" | "IN_PROGRESS" | "CONFIRMED" | "DECLINED" | "CANCELLED";
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  SUBMITTED: "Sent",
  IN_PROGRESS: "Being arranged",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};
export interface BookingRequest {
  id: string;
  ref: string;
  status: RequestStatus;
  stay: { propertyRef: string; propertyName: string; city: string | null; roomTypeName: string; planName: string; mealPlanKey: string | null; checkIn: string; checkOut: string; occupancies: { adults: number; children: number }[] };
  quoted: { totalPaise: number; sellPaise?: number; gstPaise?: number };
  customer: { name: string; phone: string | null; email: string | null; reference: string | null; guestNames: string[] };
  notes: string | null;
  hotelConfirmation: string | null;
  decisionNote: string | null;
  createdAt: string;
  version: number;
  history: { at: string; action: string; status: string; note: string | null; by?: string }[];
  clientOrgId?: string;
  handledBy?: string | null;
}
