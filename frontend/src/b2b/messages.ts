// Plain-language messages for the B2B API's error codes.
import { B2BError } from "./api";

const MESSAGES: Record<string, string> = {
  LOGIN_FAILED: "That email/phone and password don't match.",
  ACCOUNT_LOCKED: "Too many wrong attempts. The account is locked for a while — try again later or reset your password.",
  ACCOUNT_DISABLED: "This account is disabled. Please contact MusafirBaba support.",
  RATE_LIMITED: "Too many attempts. Please wait a little and try again.",
  CODE_INVALID: "That code is wrong or has expired. Ask for a new one.",
  MFA_CODE_INVALID: "That code didn't work. Codes change every 30 seconds — try the current one.",
  MFA_CODE_REQUIRED: "Two-step login is on, so enter the code from your authenticator app.",
  MFA_CHALLENGE_INVALID: "This sign-in took too long. Please start again.",
  MFA_ALREADY_ON: "Two-step login is already on.",
  MFA_ENROLMENT_REQUIRED: "Set up two-step login first (your 7-day window has ended).",
  NO_B2B_ADMIN_ROLE: "Your admin account has no B2B role yet. Ask a Super Admin to give you one.",
  PASSWORD_TOO_SHORT: "Use at least 10 characters.",
  PASSWORD_TOO_LONG: "That password is too long.",
  PASSWORD_TOO_COMMON: "That password is too easy to guess. Try a longer phrase.",
  PASSWORD_CONTAINS_EMAIL: "Don't use your email name in the password.",
  PASSWORD_INVALID: "That password is wrong.",
  EMAIL_INVALID: "Please enter a valid email address.",
  PHONE_INVALID: "Please enter a valid phone number.",
  EMAIL_TAKEN: "An account with this email already exists.",
  INVITATION_INVALID: "This invitation link is invalid, already used, or expired. Ask for a new one.",
  INVITATION_FOR_ANOTHER_EMAIL: "This invitation was sent to a different email. Sign in with that email.",
  INVITATION_ALREADY_PENDING: "An invitation to this email is already waiting.",
  ACCOUNT_EXISTS_SIGN_IN: "You already have an account. Sign in first, then open the invitation link again.",
  ALREADY_A_MEMBER: "You're already a member of this organisation.",
  CANNOT_GRANT_MORE_THAN_YOU_HAVE: "You can't give a role with more access than you have yourself.",
  CANNOT_REMOVE_MORE_POWERFUL_MEMBER: "You can't remove someone with more access than you.",
  CANNOT_CHANGE_MORE_POWERFUL_MEMBER: "You can't change someone with more access than you.",
  LAST_OWNER: "Every organisation needs at least one Owner. Make someone else Owner first.",
  ROLE_NAME_TAKEN: "A role with this name already exists.",
  ROLE_IN_USE: "Someone still has this role. Give them another role first.",
  PERMISSION_SENSITIVE: "That permission can't go into a custom role.",
  MEMBER_CHANGED_MEANWHILE: "Someone else just changed this member. Reload and try again.",
  BRANCH_NOT_FOUND: "That branch doesn't exist (or is closed).",
  PERMISSION_DENIED: "You don't have permission to do that.",
  ORG_NOT_SELECTED: "Choose an organisation first.",
  ORG_NOT_ACTIVE: "This organisation is not active.",
  ORG_NOT_SUSPENDED: "This organisation is not suspended.",
  SUPER_ADMIN_LIMIT: "There can be at most 2 Super Admins.",
  STAFF_NOT_FOUND: "No admin account with that email.",
  BUSINESS_LOGIN_NOT_CONFIGURED: "Business login isn't switched on on this server yet (B2B_AUTH_SECRET).",
  VALIDATION_FAILED: "Please check the highlighted fields.",
};

export function errorMessage(error: unknown): string {
  if (error instanceof B2BError) {
    if (error.code === "ACCOUNT_LOCKED" || error.code === "RATE_LIMITED") {
      const secs = Number((error.details as { retryAfterSeconds?: number }).retryAfterSeconds ?? 0);
      if (secs > 0) return `${MESSAGES[error.code]} (about ${Math.ceil(secs / 60)} min)`;
    }
    if (error.status === 503 && error.code === "HTTP_503") return "The B2B system is switched off on this server (B2B_ENABLED).";
    return MESSAGES[error.code] ?? error.message;
  }
  if (error instanceof TypeError) return "Can't reach the server. Is the backend running?";
  return "Something went wrong. Please try again.";
}
