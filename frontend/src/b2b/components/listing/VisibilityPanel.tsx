"use client";
// Where the listing is sold: website and / or B2B, from a date (the hotel's own date). Published at once.
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import type { Property } from "../../listing";
import { errorMessage } from "../../messages";
import { Check, inputCls, Labelled, SaveBar } from "./ui";

export function VisibilityPanel({ property, editable, onChanged }: { property: Property; editable: boolean; onChanged: (p: Property) => void }) {
  const [v, setV] = useState({ website: property.visibility.website, b2b: property.visibility.b2b, sellFrom: property.visibility.sellFrom ?? "" });
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await b2b<Property>(`/hotel/properties/${property.id}/visibility`, {
        method: "PUT",
        body: { website: v.website, b2b: v.b2b, sellFrom: v.sellFrom || null },
        headers: { "If-Match": `"${property.version}"` },
      });
      toast.success("Saved");
      onChanged(p);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-4">
      <Check label="Show on musafirbaba.com (website guests)" checked={v.website} onChange={(x) => setV({ ...v, website: x })} disabled={!editable} />
      <Check label="Show to B2B travel agents" checked={v.b2b} onChange={(x) => setV({ ...v, b2b: x })} disabled={!editable} />
      <Labelled label="Sell from (optional)" hint="Not shown to guests before this date.">
        <input type="date" className={`${inputCls} max-w-xs`} value={v.sellFrom} onChange={(e) => setV({ ...v, sellFrom: e.target.value })} disabled={!editable} />
      </Labelled>
      {property.visibility.clientCategories.length > 0 && (
        <p className="text-xs text-slate-500">MusafirBaba shows this listing only to these B2B client groups: {property.visibility.clientCategories.join(", ")}.</p>
      )}
      <SaveBar busy={busy} disabled={!editable} />
    </form>
  );
}
