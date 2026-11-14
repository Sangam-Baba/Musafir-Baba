// Readable descriptions of activity-log entries.
import type { AuditEntry } from "./types";

const LABELS: Record<string, string> = {
  "identity.session.created": "Signed in",
  "identity.session.reused": "Stolen sign-in detected — session ended",
  "identity.user.locked": "Account locked after failed sign-ins",
  "organizations.org.created": "Organisation created",
  "organizations.org.suspended": "Organisation suspended",
  "organizations.org.reactivated": "Organisation reactivated",
  "organizations.member.invited": "Member invited",
  "organizations.member.joined": "Member joined",
  "organizations.member.removed": "Member removed",
  "organizations.member.roles-changed": "Member's role changed",
  "access.role.changed": "Custom role changed",
};

export function describeEntry(e: AuditEntry): string {
  const base = LABELS[e.action] ?? e.action;
  const methods = Array.isArray(e.data.methods) ? ` (${(e.data.methods as string[]).join(" + ")})` : "";
  const change = typeof e.data.change === "string" ? ` — ${e.data.change}` : "";
  const reason = typeof e.data.reason === "string" && e.data.reason ? ` — ${e.data.reason}` : "";
  return `${base}${methods}${change}${reason}`;
}
