"use client";
// Reviewing one verification application (MusafirBaba staff): take it (30-minute lock), check the details
// against the documents, mark each document, then approve or send back.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileCheck2, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { lockState, type ReviewDetail } from "@/b2b/admin-kyc";
import { AdminPassGate, adminCall } from "@/b2b/components/admin/AdminPassGate";
import { AdminPageHeader, FleetPage, FleetPanel, Notice, PrimaryBtn, SecondaryBtn, SECTION } from "@/b2b/components/admin/kit";
import { ReviewDecision } from "@/b2b/components/admin/kyc/ReviewDecision";
import { ReviewDocuments } from "@/b2b/components/admin/kyc/ReviewDocuments";
import { ReviewFacts } from "@/b2b/components/admin/kyc/ReviewFacts";
import { HISTORY_TEXT, STATUS_TEXT } from "@/b2b/kyc";
import { errorMessage } from "@/b2b/messages";

export default function KycReviewPage() {
  const params = useParams<{ id: string }>();
  return <AdminPassGate>{(token) => <Review id={params.id} token={token} />}</AdminPassGate>;
}

function Review({ id, token }: { id: string; token: string }) {
  const queryClient = useQueryClient();
  const key = ["b2b-admin", "kyc-app", id];
  const q = useQuery({ queryKey: key, queryFn: () => adminCall<ReviewDetail>(`/admin/kyc-applications/${id}`, token) });
  const update = (d: ReviewDetail) => {
    queryClient.setQueryData(key, d);
    void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "kyc"] });
  };
  async function act(path: "assign" | "release") {
    try {
      update(await adminCall<ReviewDetail>(`/admin/kyc-applications/${id}/${path}`, token, { method: "POST" }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (q.isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!q.data) return <FleetPage><Notice tone="red">{errorMessage(q.error)}</Notice></FleetPage>;
  const app = q.data;
  const lock = lockState(app, app.you.staffId);
  const open = app.status === "SUBMITTED" || app.status === "UNDER_REVIEW";
  return (
    <FleetPage>
      <Link href="/admin/b2b" className="flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to B2B admin
      </Link>
      <AdminPageHeader section={SECTION} icon={FileCheck2} title={app.details?.legalName ?? "Verification"} description={`${STATUS_TEXT[app.status].label} · round ${app.round}`} />
      <FleetPanel bodyClassName="flex flex-wrap items-center gap-3 p-4">
        <Lock className="h-4 w-4 text-slate-400" />
        <p className="flex-1 text-[13px] text-slate-700">
          {!open
            ? `Decided ${app.decidedAt ? new Date(app.decidedAt).toLocaleString() : ""}${app.review.decisionNote ? ` — “${app.review.decisionNote}”` : ""}`
            : lock.mine
              ? `You are reviewing this until ${new Date(app.review.lockedUntil ?? "").toLocaleTimeString()}.`
              : lock.other
                ? `Another reviewer has it until ${new Date(app.review.lockedUntil ?? "").toLocaleTimeString()}.`
                : "Nobody is reviewing this yet."}
        </p>
        {open && app.you.canReview && !lock.other && <PrimaryBtn onClick={() => act("assign")}>{lock.mine ? "Keep for 30 more minutes" : "Take for review"}</PrimaryBtn>}
        {lock.mine && <SecondaryBtn onClick={() => act("release")}>Let go</SecondaryBtn>}
        <Link href={`/admin/b2b/orgs/${app.orgId}`} className="text-[13px] text-[#FE5300] hover:underline">
          Organisation page
        </Link>
      </FleetPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ReviewFacts app={app} token={token} />
          {lock.mine && <ReviewDecision app={app} token={token} onChanged={update} />}
        </div>
        <div className="flex flex-col gap-4">
          <ReviewDocuments app={app} token={token} canAct={lock.mine} onChanged={update} />
          <FleetPanel title="Timeline" bodyClassName="p-4">
            <ol className="space-y-1.5">
              {[...app.history].reverse().map((h, i) => (
                <li key={`${h.at}-${i}`} className="text-[12px] text-slate-600">
                  <span className="text-slate-400">{new Date(h.at).toLocaleString()}</span> · {HISTORY_TEXT[h.action] ?? h.action}
                  {h.note ? ` — ${h.note}` : ""}
                </li>
              ))}
            </ol>
          </FleetPanel>
        </div>
      </div>
    </FleetPage>
  );
}
