"use client";
// B2B admin → Operations (Stage 09): the after-booking queues and hotel payouts.
import { useState } from "react";

import { PayoutsPanel } from "./PayoutsPanel";
import { QueuesPanel } from "./QueuesPanel";

const SECTIONS = [
  { key: "queues", label: "Queues" },
  { key: "payouts", label: "Hotel payouts" },
] as const;

export function OperationsTab({ token }: { token: string }) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["key"]>("queues");
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)} className={`rounded-md border px-3 py-1 text-[12px] ${section === s.key ? "border-[#FE5300] bg-orange-50 font-medium text-[#FE5300]" : "border-slate-200 bg-white text-slate-600"}`}>{s.label}</button>
        ))}
      </div>
      {section === "queues" ? <QueuesPanel token={token} /> : <PayoutsPanel token={token} />}
    </div>
  );
}
