"use client";
// Saves one wizard section with the version the screen loaded (If-Match). 412 = someone saved in between.
import { useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "../../api";
import type { Property, Section } from "../../listing";
import { errorMessage } from "../../messages";

export function useSaveSection(property: Property, onSaved: (p: Property) => void) {
  const [busy, setBusy] = useState(false);
  async function save(section: Section, body: unknown) {
    setBusy(true);
    try {
      const p = await b2b<Property>(`/hotel/properties/${property.id}/sections/${section}`, { method: "PUT", body, headers: { "If-Match": `"${property.version}"` } });
      onSaved(p);
      toast.success(p.pendingRevision && property.status !== "DRAFT" ? "Saved — some changes wait for MusafirBaba's approval" : "Saved");
      return true;
    } catch (err) {
      if (err instanceof B2BError && err.status === 412) toast.error("Someone else saved this listing meanwhile. Reload the page and try again.");
      else if (err instanceof B2BError && err.code === "VALIDATION_FAILED") {
        const first = (err.details.errors as { path: string; message: string }[] | undefined)?.[0];
        toast.error(first ? `${first.path.replace(/^body\./, "")}: ${first.message}` : errorMessage(err));
      } else toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { save, busy };
}
