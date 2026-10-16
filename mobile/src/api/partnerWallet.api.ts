import { apiClient } from './axios';

// MBConnect Partner Wallet program (backend: /api/partner/wallet, /partner/bookings/:id/cancel).

export interface WalletRules {
  firstRechargeMin: number;
  minRecharge: number;
  maxRecharge: number;
  minBalance: number;
  feePerKm: number;
  cancellation: {
    freeMinutes: number;
    regularWithin24h: number;
    regularAfter24h: number;
    outstationFreeDays: number;
    outstationMidPerKm: number;
    outstationLatePerKm: number;
  };
}

// One wallet: same history as trip earnings. amount is always positive; the type says the direction.
export interface WalletTxn {
  _id: string;
  type:
    | 'trip_pending_credit'
    | 'admin_release'
    | 'admin_credit'
    | 'admin_debit'
    | 'recharge'
    | 'platform_fee'
    | 'cancel_charge'
    | 'cancel_charge_refund'
    | 'payout'
    | 'payout_reversed';
  amount: number;
  walletBalanceAfter: number;
  pendingWalletBalanceAfter?: number;
  note?: string;
  createdAt: string;
}

export interface Wallet {
  enabled: boolean;
  balance: number;
  reserved: number;
  available: number;
  pending: number;
  firstRechargeDone: boolean;
  rules: WalletRules;
  transactions: WalletTxn[];
}

// Withdrawals to bank (admin transfers manually and marks them paid / cancelled).
export type PayoutStatus = 'REQUESTED' | 'PROCESSING' | 'PAID' | 'CANCELLED';
export interface PayoutItem {
  _id: string;
  code: string;
  amount: number;
  status: PayoutStatus;
  bankName: string;
  accountEnding: string;
  utr: string;
  cancelReason: string;
  cancelledBy: '' | 'DRIVER' | 'ADMIN';
  createdAt: string;
  processingAt?: string;
  paidAt?: string;
  cancelledAt?: string;
}
export interface PayoutsData {
  available: number;
  pending: number;
  minWithdrawal: number;
  bank: { bankName: string; accountHolderName: string; accountEnding: string; ifsc: string; status: string } | null;
  hasOpenRequest: boolean;
  items: PayoutItem[];
}
export const getPayouts = () => apiClient.get<{ success: boolean; data: PayoutsData }>('/partner/payouts');
export const requestWithdrawal = (amount: number) =>
  apiClient.post<{ success: boolean; message: string; data: PayoutItem }>('/partner/payouts', { amount });
export const cancelWithdrawal = (id: string) => apiClient.post<{ success: boolean; message: string }>(`/partner/payouts/${id}/cancel`);

export const getWallet = () => apiClient.get<{ success: boolean; data: Wallet }>('/partner/wallet');
export const startRecharge = (amount: number) =>
  apiClient.post<{ success: boolean; checkoutUrl: string; message?: string }>('/partner/wallet/recharge', { amount });

export const getCancelReasons = () => apiClient.get<{ success: boolean; data: { key: string; label: string; reviewed: boolean }[] }>('/partner/cancel-reasons');
export const getCancelPreview = (rideId: string) =>
  apiClient.get<{ success: boolean; data: { charge: number; rule: string } }>(`/partner/bookings/${rideId}/cancel-preview`);
export const cancelTrip = (rideId: string, reasonKey: string, comment?: string) =>
  apiClient.post<{ success: boolean; message: string }>(`/partner/bookings/${rideId}/cancel`, { reasonKey, comment });

// Why Accept is blocked ('' = can accept). Same rule as the server.
export function walletBlockReason(w: Wallet | null | undefined, fee = 0): string {
  if (!w?.enabled) return '';
  if (w.available - fee < w.rules.minBalance) return `Low wallet balance. Keep at least ₹${w.rules.minBalance} after the trip fee.`;
  return '';
}
