"use client";
// Where the listing is sold, as MusafirBaba sees it — including the B2B client categories only MusafirBaba sets.
import { useState } from "react";
import { toast } from "sonner";

import type { Property } from "../../../listing";
import { errorMessage } from "../../../messages";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, Input, inputSm, PrimaryBtn } from "../kit";

export function AdminVisibility({ property, token, onChanged }: { property: Property; token: string; onChanged: () => void }) {
  const [v, setV] = useState({ ...property.visibility, sellFrom: property.visibility.sellFrom ?? "", categories: property.visibility.clientCategories.join(", ") });
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const clientCategories = v.categories.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
      await adminCall(`/admin/properties/${property.id}/visibility`, token, {
        method: "PUT",
        body: { website: v.website, b2b: v.b2b, sellFrom: v.sellFrom || null, clientCategories },
        headers: { "If-Match": `"${property.version}"` },
      });
      toast.success("Visibility saved");
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <FleetPanel title="Where it's sold" bodyClassName="space-y-2 p-4 text-[13px]">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={v.website} onChange={(e) => setV({ ...v, website: e.target.checked })} /> Website
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={v.b2b} onChange={(e) => setV({ ...v, b2b: e.target.checked })} /> B2B
      </label>
      <label className="block">
        <span className="text-[12px] text-slate-600">Sell from</span>
        <Input type="date" className={inputSm} value={v.sellFrom} onChange={(e) => setV({ ...v, sellFrom: e.target.value })} />
      </label>
      <label className="block">
        <span className="text-[12px] text-slate-600">B2B client categories (comma-separated, empty = all clients)</span>
        <Input className={inputSm} value={v.categories} onChange={(e) => setV({ ...v, categories: e.target.value })} placeholder="e.g. corporate, premium-agents" />
      </label>
      <PrimaryBtn disabled={busy} onClick={save}>
        Save
      </PrimaryBtn>
    </FleetPanel>
  );
}
