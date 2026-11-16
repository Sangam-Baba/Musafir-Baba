"use client";
// Reviewing one listing (MusafirBaba staff): checklist and duplicates, details and photos, the decision, pending changes,
// and where it's sold.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Hotel, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import type { ListingDetail } from "@/b2b/admin-listing";
import { AdminBell } from "@/b2b/components/admin/AdminBell";
import { AdminPassGate, adminCall } from "@/b2b/components/admin/AdminPassGate";
import { AdminPageHeader, FleetPage, Notice, SECTION } from "@/b2b/components/admin/kit";
import { AdminVisibility } from "@/b2b/components/admin/listing/AdminVisibility";
import { ListingDecision } from "@/b2b/components/admin/listing/ListingDecision";
import { ListingChecklist, ListingFacts } from "@/b2b/components/admin/listing/ListingFacts";
import { RevisionReview } from "@/b2b/components/admin/listing/RevisionReview";
import { STATUS, type Masters } from "@/b2b/listing";
import { errorMessage } from "@/b2b/messages";

export default function AdminPropertyPage() {
  const params = useParams<{ id: string }>();
  return <AdminPassGate>{(token) => <Review id={params.id} token={token} />}</AdminPassGate>;
}

function Review({ id, token }: { id: string; token: string }) {
  const queryClient = useQueryClient();
  const key = ["b2b-admin", "listing", id];
  const detail = useQuery({ queryKey: key, queryFn: () => adminCall<ListingDetail>(`/admin/properties/${id}`, token) });
  const masters = useQuery({ queryKey: ["b2b-admin", "masters"], queryFn: () => adminCall<Masters>("/admin/masters", token), staleTime: 300_000 });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["b2b-admin"] });
  const update = (d: ListingDetail) => {
    queryClient.setQueryData(key, d);
    void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "listings"] });
  };

  if (detail.isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!detail.data) return <FleetPage><Notice tone="red">{errorMessage(detail.error)}</Notice></FleetPage>;
  const d = detail.data;
  const p = d.property;
  return (
    <FleetPage>
      <Link href="/admin/b2b" className="flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to B2B admin
      </Link>
      <AdminPageHeader
        section={SECTION}
        icon={Hotel}
        title={p.name}
        description={`${STATUS[p.status].label} · ${p.publicRef}${p.round ? ` · submitted ${p.round}×` : ""}`}
        actions={<AdminBell token={token} />}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ListingChecklist detail={d} />
          <ListingDecision detail={d} token={token} onChanged={update} />
          <RevisionReview detail={d} masters={masters.data} token={token} onDecided={refresh} />
          {p.status !== "ARCHIVED" && <AdminVisibility key={p.version} property={p} token={token} onChanged={refresh} />}
        </div>
        <div className="flex flex-col gap-4">
          <ListingFacts detail={d} masters={masters.data} />
        </div>
      </div>
    </FleetPage>
  );
}
