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
