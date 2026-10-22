import { apiClient } from './axios';

export interface PayUCheckout {
  payuUrl: string;
  paymentData: Record<string, string | number>;
  walletUsed?: number; // ₹ taken from MB Wallet (only when useWallet was sent)
  payable?: number; // ₹ PayU will charge
}

// The generic /payment endpoint (used by every other booking type) is gated
// by the app's user/admin auth system, which a rider's token can never pass
// (riders authenticate through a separate, isolated JWT system by design).
// /payment/ride is the rider-authenticated equivalent — the backend resolves
// the amount/txnid/product info itself from the stored ride rather than
// trusting them from the client.
// useWallet (optional): pay part of the bill from MB Wallet. Without it the
// request is exactly as before and the full fare is charged.
export const initiateRidePayment = (rideId: string, useWallet?: boolean) =>
  apiClient.post<PayUCheckout>('/payment/ride', useWallet ? { rideId, useWallet: true } : { rideId });

// PayU expects a real browser POST with all fields as a form submission, not
// a GET redirect — build a tiny auto-submitting HTML page for the WebView.
export function buildPayUAutoSubmitHtml(checkout: PayUCheckout): string {
  const inputs = Object.entries(checkout.paymentData)
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, '&quot;')}" />`)
    .join('\n');

  return `
    <html>
      <body onload="document.forms[0].submit()">
        <form action="${checkout.payuUrl}" method="post">
          ${inputs}
        </form>
      </body>
    </html>
  `;
}
