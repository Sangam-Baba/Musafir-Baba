"use client";
// My Bookings for B2B clients (Stage 12 part B).
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { MyBookings } from "@/b2b/components/client/MyBookings";
import { PageHeader } from "@/b2b/components/portal/ui";

export default function MyBookingsPage() {
  return (
    <BusinessShell>
      {(me) =>
        me.permissions.includes("orders.order.read") ? (
          <div className="space-y-4">
            <PageHeader title="My" highlight="bookings" subtitle="Your company's bookings. Open one to see its documents, cancel it or ask for a change." />
            <MyBookings canExport={me.permissions.includes("orders.export.read")} />
          </div>
        ) : (
          <p className="text-[13px] text-slate-600">Bookings are for B2B client companies.</p>
        )
      }
    </BusinessShell>
  );
}
