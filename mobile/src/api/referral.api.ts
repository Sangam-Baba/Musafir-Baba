import { apiClient } from './axios';
import { API_BASE_URL } from '../utils/config';
import { getItem, setItem, removeItem } from '../utils/storage';

// MBConnect Refer & Earn (backend: /api/partner/referral, /api/partner-referral/validate).

export type ReferralStatus = 'LINKED' | 'QUALIFIED' | 'IN_REVIEW' | 'REWARDED' | 'REJECTED' | 'EXPIRED' | 'REVERSED';
export interface MyReferral {
  enabled: boolean;
  code: string;
  terms: string;
  rules: { referrerReward: number; joiningBonus: number; unlockAfter: number; expiryDays: number };
  stats: { rewarded: number; pending: number; total: number; lockedBalance: number; unlocked: boolean; unlockedAt: string | null };
  referrals: { _id: string; name: string; status: ReferralStatus; reward: number; createdAt: string; rewardedAt?: string; rejectReason?: string }[];
  referredBy: { name: string; code: string; status: ReferralStatus; joiningBonus: number } | null;
  canEnterCode: boolean;
}

export const getMyReferral = () => apiClient.get<{ success: boolean; data: MyReferral }>('/partner/referral');
export const applyReferralCode = (code: string, source: 'email' | 'google' | 'later') =>
  apiClient.post<{ success: boolean; message: string; referrerName?: string }>('/partner/referral/apply', { code, source });

// Public check used on the Register screen (before sign-in).
export async function validateReferralCode(code: string): Promise<{ valid: boolean; enabled?: boolean; referrerName?: string; joiningBonus?: number; message?: string }> {
  const res = await fetch(`${API_BASE_URL}/partner-referral/validate?code=${encodeURIComponent(code)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { valid: false, message: data.message || 'Could not check the code.' };
  return data;
}

// ---- Code typed on Register, attached right after sign-in (email or Google) ----
const KEY = 'pending_referral_code';
export const savePendingReferral = (code: string, source: 'email' | 'google') => setItem(KEY, JSON.stringify({ code, source }));
export const clearPendingReferral = () => removeItem(KEY);
export async function setPendingReferralSource(source: 'email' | 'google') {
  const raw = await getItem(KEY);
  if (!raw) return;
  try {
    const p = JSON.parse(raw);
    await setItem(KEY, JSON.stringify({ ...p, source }));
  } catch {}
}
// Returns a message to show, or null if there was nothing to do.
export async function applyPendingReferral(): Promise<{ ok: boolean; message: string } | null> {
  const raw = await getItem(KEY);
  if (!raw) return null;
  let pending: { code: string; source: 'email' | 'google' };
  try {
    pending = JSON.parse(raw);
  } catch {
    await clearPendingReferral();
    return null;
  }
  try {
    const res = await applyReferralCode(pending.code, pending.source);
    await clearPendingReferral();
    return { ok: true, message: res.data.referrerName ? `Referred by ${res.data.referrerName}. ${res.data.message}` : res.data.message };
  } catch (e: any) {
    if (e?.response?.status) {
      // A definite answer (e.g. already linked / invalid): don't retry.
      await clearPendingReferral();
      return { ok: false, message: e.response.data?.message || 'Referral code could not be added.' };
    }
    return null; // network problem: keep it and try again next time
  }
}
