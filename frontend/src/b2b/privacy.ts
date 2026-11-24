// Stage 16 (DPDP): the privacy notice version people agree to, and recording that they did. Recording never blocks the
// person — if it fails, the booking or registration still goes ahead (the order / registration itself is the record).
import { B2B_API } from "./api";

export const PRIVACY_NOTICE_VERSION = "2026-11";
export const PRIVACY_NOTICE_URL = "/privacy-policy";

export function recordConsent(purpose: "business-registration" | "hotel-checkout", subjectRef: string | null) {
  void fetch(`${B2B_API}/privacy/consents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-B2B-Auth": "1" },
    body: JSON.stringify({ purpose, noticeVersion: PRIVACY_NOTICE_VERSION, subjectRef }),
    keepalive: true,
  }).catch(() => undefined);
}
