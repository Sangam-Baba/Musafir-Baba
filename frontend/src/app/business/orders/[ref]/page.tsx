"use client";
// A B2B client's order (Stage 12 part B): pay from the wallet or by PayU, then the confirmation and documents.
import { useParams } from "next/navigation";

import { BusinessShell } from "@/b2b/components/BusinessShell";
import { ClientOrder } from "@/b2b/components/client/ClientOrder";

export default function ClientOrderPage() {
  const params = useParams<{ ref: string }>();
  return (
    <BusinessShell>
      {(me) =>
        me.permissions.includes("orders.order.read") ? (
          <ClientOrder orderRef={params.ref} canPay={me.permissions.includes("orders.order.create") && !me.viewAs} />
        ) : (
          <p className="text-[13px] text-slate-600">Orders are for B2B client companies.</p>
        )
      }
    </BusinessShell>
  );
}
