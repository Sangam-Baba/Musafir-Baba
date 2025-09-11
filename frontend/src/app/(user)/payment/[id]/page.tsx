'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader } from '@/components/custom/loader';
import { Card } from '@/components/ui/card';
declare global {
  interface Window {
    Razorpay: new (options: any) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}



type RazorResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type BookingApiResponse = {
  data: {
    _id: string;
    totalPrice: number;
    firstName?: string;
    razorpayOrderId?: string;
  };
};
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    const existing = document.getElementById('razorpay-script');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.id = 'razorpay-script';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    } else {
      resolve(true);
    }
  });
}

async function getBooking(bookingId: string, accessToken: string | null) {
  if (!bookingId) throw new Error('Missing booking id');
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/booking/${bookingId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch booking (${res.status})`);
  }
  const json = (await res.json()) as BookingApiResponse;
  return json;
}

async function createOrderForBooking(bookingId: string, accessToken: string | null) {
  if (!bookingId) throw new Error('Missing booking id');
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
    },
    body: JSON.stringify({ bookingId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Create order failed (${res.status})`);
  }
  return res.json();
}

async function verifyPaymentOnServer(response: RazorResponse, bookingId: string, accessToken: string | null) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/payment/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
    },
    body: JSON.stringify({ ...response, bookingId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Verify payment failed (${res.status})`);
  }
  return res.json();
}


export default function CheckoutButton() {
  const accessToken = useAuthStore((s) => s.accessToken ?? null);
  const params = useParams();
  const router = useRouter();
  const bookingId = typeof params?.id === 'string' ? params.id : String(params?.id ?? '');

  const { data: bookingResp, isLoading, isError, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => getBooking(bookingId, accessToken),
    enabled: Boolean(bookingId && accessToken),
    staleTime: 1000 * 60,
  });

  const verifyMutation = useMutation({
    mutationFn: (vars: { response: RazorResponse; bookingId: string }) =>
      verifyPaymentOnServer(vars.response, vars.bookingId, accessToken),
  });


  if (isLoading) return <Loader size="lg" message="Loading booking..." />;

  if (isError) {
    const msg = (error )?.message ?? 'Failed to load booking';
    toast.error(msg);
    return <h1 className="text-red-600">{msg}</h1>;
  }

  const booking = bookingResp?.data;
  const price = booking?.totalPrice ?? 0; // rupees
  const name = booking?.firstName ?? '';
  const amountInPaise = Math.round(price * 100);

  const handlePayment = async () => {
    if (!bookingId) {
      toast.error('Missing booking reference.');
      return;
    }
    const sdkOk = await loadRazorpayScript();
    if (!sdkOk) {
      toast.error('Failed to load Razorpay SDK.');
      return;
    }

    let orderJson;
    try {
      orderJson = await createOrderForBooking(bookingId, accessToken);
    } catch (err) {
      console.error('create-order error', err);
      toast.error( 'Create order failed');
      return;
    }

    if (orderJson.alreadyPaid) {
      toast.success('Booking is already paid.');
      router.push(`/booking/${bookingId}/success`);
      return;
    }

    const order = {
      id: orderJson.orderId ?? orderJson.order?.id ?? orderJson.id,
      amount: orderJson.amount ?? orderJson.order?.amount ?? amountInPaise,
      currency: orderJson.currency ?? orderJson.order?.currency ?? 'INR',
    };

    const options = {
      key: orderJson.key ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'Musafir Baba',
      description: `Booking ${bookingId}`,
      order_id: order.id,
      handler: async function (response: RazorResponse) {
        try {
          // verify on server (signature)
          await verifyMutation.mutateAsync({ response, bookingId });
          toast.success('Payment successful — booking paid.');
          router.replace(`/payment/${bookingId}/success`);
        } catch (err) {
          console.error('verify or update failed', err);
          toast.error( 'Payment verification/update failed.');

          toast.error('Payment Failed — booking failed.');
          router.push(`/payment/${bookingId}/failed`);
        }
      },
      prefill: {
        name,
        email: '', // pass known email if available
        contact: '',
      },
      theme: { color: '#F37254' },
    };

    const rzp = new window.Razorpay(options);

rzp.on('payment.failed', async function (resp: { error?: { description?: string } }) {
  console.error('Payment failed callback', resp);
  toast.error('Payment failed. ' + (resp?.error?.description ?? ''));
});


    rzp.open();
  };

  const busy = verifyMutation.isPending;

  return (
    <section className='w-full px-4 md:px-8 lg:px-20 py-16'>
    <Card className=" p-4">
      <p className="mb-2">Pay this Amount: ₹{(amountInPaise / 100).toFixed(2)} to complete your booking</p>
      <Button className='bg-[#FE5300] ' onClick={handlePayment} disabled={busy}>
        {busy ? 'Processing...' : `Pay ₹${(amountInPaise / 100).toFixed(2)}`}
      </Button>
    </Card>
    </section>

  );
}
