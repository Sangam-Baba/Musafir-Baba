// Shapes returned by the B2B API (kept in step with backend/src/b2b).
export type OrgType = "PLATFORM" | "CLIENT" | "HOTEL";

export interface BusinessUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
}

export interface Membership {
  orgId: string;
  reference: string;
  displayName: string;
  type: OrgType;
  status: string;
  roles: string[];
}

export interface Me {
  user: BusinessUser;
  mfa: { totp: "off" | "pending" | "on"; recoveryCodesLeft: number };
  memberships: Membership[];
  blockedOrgs: { orgId: string; displayName: string; status: string; reason: string | null }[];
  currentOrgId: string | null;
  /** what the signed-in member may do in the current org (to hide buttons; the server always checks) */
  permissions: string[];
  /** set while a MusafirBaba admin is viewing this org */
  viewAs?: { mode: "READ" | "WRITE"; expiresAt: string; reason: string };
}

export interface Tokens {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

export interface MfaChallenge {
  mfaRequired: true;
  mfaToken: string;
  expiresIn: number;
}

export type SignInResult = Tokens | MfaChallenge;

export const isMfaChallenge = (r: SignInResult): r is MfaChallenge => "mfaRequired" in r;

export interface Member {
  userId: string;
  name: string | null;
  email: string | null;
  roles: string[];
  branchIds: string[];
  propertyIds: string[];
  ownOnly: boolean;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  roles: string[];
  branchIds: string[];
  status: string;
  expiresAt: string;
}

export interface Role {
  ref: string;
  kind: "system" | "custom";
  name: string;
  description: string;
  permissions: string[];
}

export interface ChoosablePermission {
  code: string;
  group: string;
  description: string;
  locked: boolean;
}

export interface Branch {
  id: string;
  name: string;
  city: string | null;
  stateCode: string | null;
  status: "ACTIVE" | "CLOSED";
}

export interface AuditEntry {
  id: string;
  action: string;
  orgId: string | null;
  userId: string | null;
  actorId: string | null;
  data: Record<string, unknown>;
  occurredAt: string;
}
