"use client";
// Calendar changes: who changed which nights and when (including MusafirBaba changes with their reason); the latest
// change can be undone. Uses GET …/calendar/changes and POST …/calendar/undo.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History } from "lucide-react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { KIND_TEXT, type ChangeEntry } from "../../inventory";
import { errorMessage } from "../../messages";
import { useBusinessSession } from "../../session-store";
import { Panel, Pill } from "../portal/ui";

export function HistoryPanel({ propertyId, canManage, onChanged }: { propertyId: string; canManage: boolean; onChanged: () => void }) {
  const token = useBusinessSession((s) => s.accessToken);
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["b2b", "calendar-changes", propertyId, token], queryFn: () => b2b<{ data: ChangeEntry[] }>(`/hotel/properties/${propertyId}/calendar/changes`) });
  const items = list.data?.data ?? [];
  const latest = items.find((c) => c.kind !== "UNDO" && !c.undoneAt);

  async function undo(id: string) {
    if (!window.confirm("Undo this change? Nights booked since keep their rooms.")) return;
    try {
      await b2b(`/hotel/properties/${propertyId}/calendar/undo`, { method: "POST", body: { changeId: id } });
      toast.success("Change undone");
      void queryClient.invalidateQueries({ queryKey: ["b2b", "calendar-changes", propertyId] });
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Panel icon={History} title="Changes" subtitle="The last 30 changes to rooms, prices and rules.">
      {list.isLoading ? (
        <p className="text-[13px] text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-slate-500">No changes yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-[13px]">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-slate-900">
                  <Pill tone={c.kind === "OVERRIDE" ? "violet" : c.kind === "UNDO" ? "amber" : "blue"}>{KIND_TEXT[c.kind]}</Pill> nights {c.from} → {c.to}
                  {c.undoneAt && <span className="ml-2 text-xs text-slate-400">undone</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(c.at).toLocaleString("en-IN")} · {c.by.startsWith("staff:") ? "MusafirBaba" : "your team"}
                  {c.reason ? ` · “${c.reason}”` : ""}
                </p>
              </div>
              {canManage && latest?.id === c.id && (
                <button onClick={() => undo(c.id)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">Undo</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
