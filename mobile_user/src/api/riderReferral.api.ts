import { apiClient } from './axios';
import { getItem, setItem, removeItem } from '../utils/storage';

// MBGO Refer & Earn + MB Wallet (backend: /api/rider/referral, /api/rider-referral).

export type RiderReferralStatus = 'LINKED' | 'QUALIFIED' | 'IN_REVIEW' | 'REWARDED' | 'REJECTED' | 'EXPIRED' | 'REVERSED';

export interface MyRiderReferral {
  enabled: boolean;
  code: string;
  terms: string;
  rules: { referrerReward: number; joiningBonus: number; linkWindowDays: number };
  stats: { rewarded: number; pending: number; total: number; earned: number };
  walletBalance: number;
  referrals: { _id: string; name: string; status: RiderReferralStatus; reward: number; createdAt: string; rewardedAt?: string; rejectReason?: string }[];
  referredBy: { name: string; code: string; status: RiderReferralStatus; joiningBonus: number } | null;
  canEnterCode: boolean;
}

export interface RiderWalletTxn {
  _id: string;
  type: 'referral_reward' | 'referral_joining_bonus' | 'ride_wallet_payment' | 'ride_wallet_refund' | 'referral_reversal' | 'admin_credit' | 'admin_debit';
  amount: number;
  balanceAfter?: number;
  note?: string;
  rideId?: string;
  createdAt: string;
}

export interface RiderWallet {
  balance: number;
  maxPerRide: number; // 0 = no cap
  transactions: RiderWalletTxn[];
}

export const validateRiderReferralCode = (code: string) =>
  apiClient.get<{ success: boolean; valid: boolean; enabled?: boolean; message?: string; code?: string; referrerName?: string; joiningBonus?: number }>(
    '/rider-referral/validate',
    { params: { code } }
  );

export const getMyRiderReferral = () => apiClient.get<{ success: boolean; data: MyRiderReferral }>('/rider/referral');

export const applyRiderReferralCode = (code: string, source: 'email' | 'google' | 'later') =>
  apiClient.post<{ success: boolean; message: string; referrerName?: string; status?: RiderReferralStatus }>('/rider/referral/apply', { code, source });

export const getMyRiderWallet = () => apiClient.get<{ success: boolean; data: RiderWallet }>('/rider/referral/wallet');

// A valid code typed on Create Account is kept on the phone and added right
// after the first sign-in (OTP or Google), then forgotten.
const PENDING_KEY = 'pending_rider_referral';

export async function savePendingRiderReferral(code: string | null, source: 'email' | 'google' = 'email') {
  if (!code) await removeItem(PENDING_KEY);
  else await setItem(PENDING_KEY, JSON.stringify({ code, source }));
}

export async function applyPendingRiderReferral(): Promise<string | null> {
  const raw = await getItem(PENDING_KEY);
  if (!raw) return null;
  let pending: { code: string; source: 'email' | 'google' };
  try {
    pending = JSON.parse(raw);
  } catch {
    await removeItem(PENDING_KEY);
    return null;
  }
  try {
    const res = await applyRiderReferralCode(pending.code, pending.source);
    await removeItem(PENDING_KEY);
    return res.data.message;
  } catch (e: any) {
    // The server said no (invalid / already added / window over): forget it.
    // Network trouble: keep it and try again next time.
    if (e?.response?.status && e.response.status < 500) await removeItem(PENDING_KEY);
    return null;
  }
}
