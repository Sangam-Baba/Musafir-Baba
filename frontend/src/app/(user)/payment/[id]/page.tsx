'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader } from '@/components/custom/loader';
import { Card } from '@/components/ui/card';

type BookingApiResponse = {
  data: {
    _id: string;
    totalPrice: number;
    firstName?: string;
    razorpayOrderId?: string;
  };
};

async function getBooking(bookingId: string, accessToken: string | null) {
  if (!bookingId) throw new Error('Missing booking id');

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/booking/${bookingId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: accessToken ? `Bearer ${accessToken}` : '',
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch booking (${res.status})`);
  }

  return (await res.json()) as BookingApiResponse;
}

export default function CheckoutButton() {
  const [toggle, setToggle] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({key:"", txnid:"", amount:"", productinfo:"", firstname:"", lastname:"", email:"", phone:"", surl:"", furl:"", hash:"", udf1:"", service_provider:""});
  const accessToken = useAuthStore((s) => s.accessToken ?? null);
  const { id } = useParams(); // ✅ directly extract id
  const bookingId = String(id ?? ''); // safe conversion

  const {
    data: bookingResp,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => getBooking(bookingId, accessToken),
    enabled: Boolean(bookingId && accessToken),
    staleTime: 1000 * 60,
  });

  if (isLoading) return <Loader size="lg" message="Loading booking..." />;

  if (isError) {
    const msg = (error as Error)?.message ?? 'Failed to load booking';
    toast.error(msg);
    return <h1 className="text-red-600">{msg}</h1>;
  }

  const booking = bookingResp?.data;
  const price = booking?.totalPrice ?? 0;
  const amountInPaise = Math.round(price * 100);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const txnid = 'txn' + Date.now();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            txnid,
            amount: price.toFixed(2),
            productinfo: 'Travel Package',
            firstname: booking?.firstName ?? 'Guest',
            email: 'abhi@example.com',
            phone: '9876543210',
            udf1: booking?._id
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Payment init failed: ${res.status}`);
      }

      const { payuUrl, paymentData } = await res.json();
      setPaymentData(paymentData);
      setToggle(true);
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-16">
      <Card className="p-4">
        <p className="mb-2">
          Pay this Amount: ₹{(amountInPaise / 100).toFixed(2)} to complete your
          booking
        </p>
        <Button
          className="bg-[#FE5300]"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading
            ? 'Processing...'
            : `Pay ₹${(amountInPaise / 100).toFixed(2)}`}
        </Button>
        <div className="mt-4 bg-green-100 p-4">
          {toggle &&  
          <form action="https://secure.payu.in/_payment" method="post">
              <input type="hidden" name="key" value={paymentData.key} />
              <input type="hidden" name="txnid" value={paymentData.txnid}/>
              <input type="hidden" name="productinfo" value={paymentData.productinfo} />
              <input type="hidden" name="amount" value={paymentData.amount} />
              <input type="hidden" name="email" value={paymentData.email} />
              <input type="hidden" name="firstname" value={paymentData.firstname} />
              <input type="hidden" name="lastname" value={paymentData.lastname} />
              <input type="hidden" name="surl" value={paymentData.surl} />
              <input type="hidden" name="furl" value={paymentData.furl}/>
              <input type="hidden" name="phone" value={paymentData.phone} />
              <input type="hidden" name="hash" value={paymentData.hash} />
              <input type="hidden" name="udf1" value={paymentData.udf1} />
              <input type="submit" value="Submit" className="bg-[#FE5300] text-white py-2 px-4 rounded-md" />
         </form>
          }
          </div>
      </Card>
    </section>
  );
}
