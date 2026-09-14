import { riderFetchJson } from "@/lib/riderFetch";

export interface PayUCheckout {
  payuUrl: string;
  paymentData: Record<string, string | number>;
}

// /payment/ride is the rider-authenticated equivalent of the generic
// /payment endpoint (which is gated by the site's user/admin auth and can
// never accept a rider token). The backend resolves amount/txnid/product
// info itself from the stored ride rather than trusting the client.
export const initiateRidePayment = (rideId: string) =>
  riderFetchJson<PayUCheckout>("/payment/ride", {
    method: "POST",
    body: JSON.stringify({ rideId }),
  });

// PayU expects a real browser POST with every field as a form submission.
// Since the web app IS the browser (unlike mobile's WebView), we can just
// build the form directly in the DOM and submit it as a full-page navigation.
export function submitPayUForm(checkout: PayUCheckout) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.payuUrl;

  Object.entries(checkout.paymentData).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
