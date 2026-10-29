"use client";

// Edit check-in / check-out times. Only one account may use this; the
// backend decides (GET /attendance/edit-times/access) and re-checks on save,
// so nothing here changes for any other user — the button never renders.

import { useEffect, useState } from "react";
import { secureAdminFetch } from "@/lib/secureAdminFetch";

export function useAttendanceTimeEditAccess() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance/edit-times/access`);
        if (!response.ok) return;
        const res = await response.json();
        if (!cancelled) setAllowed(res?.success === true && res?.allowed === true);
      } catch {
        // No access on any failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return allowed;
}

// "2026-10-23T03:20:00.000Z" -> "08:50" (IST)
const toISTHHMM = (dateString?: string | null) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export interface EditTimeTarget {
  staffId: string;
  staffName?: string;
  date: string; // YYYY-MM-DD (IST)
  checkInTime?: string | null;
  checkOutTime?: string | null;
  breaks?: { start?: string | null; end?: string | null }[];
}

interface BreakRow {
  start: string;
  end: string;
}

export function EditAttendanceTimeModal({
  target,
  onClose,
  onSaved,
}: {
  target: EditTimeTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [checkIn, setCheckIn] = useState(toISTHHMM(target.checkInTime));
  const [checkOut, setCheckOut] = useState(toISTHHMM(target.checkOutTime));
  const [breakRows, setBreakRows] = useState<BreakRow[]>(
    (target.breaks || []).filter((b) => b?.start).map((b) => ({ start: toISTHHMM(b.start), end: toISTHHMM(b.end) }))
  );
  // Breaks are only sent once edited, so saving times alone never rewrites them
  const [breaksTouched, setBreaksTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateBreaks = (rows: BreakRow[]) => {
    setBreakRows(rows);
    setBreaksTouched(true);
  };

  const handleSave = async () => {
    setError("");
    if (!checkIn) return setError("Check-in time is required.");
    if (checkOut && checkOut <= checkIn) return setError("Check-out must be after check-in.");
    if (breaksTouched) {
      for (const [i, b] of breakRows.entries()) {
        const label = `Break ${i + 1}`;
        if (!b.start) return setError(`${label}: start time is required.`);
        if (b.end && b.end <= b.start) return setError(`${label}: end must be after start.`);
        if (b.start < checkIn) return setError(`${label}: can't start before check-in.`);
        if (checkOut && (!b.end || b.end > checkOut)) return setError(`${label}: must end by check-out.`);
      }
    }
    try {
      setSaving(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance/edit-times`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: target.staffId,
          date: target.date,
          checkIn,
          checkOut: checkOut || null,
          ...(breaksTouched && { breaks: breakRows.map((b) => ({ start: b.start, end: b.end || null })) }),
        }),
      });
      const res = await response.json().catch(() => null);
      if (response.ok && res?.success) {
        onSaved();
        onClose();
      } else {
        setError(res?.message || "Failed to update times.");
      }
    } catch {
      setError("Failed to update times.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Edit Check-in / Check-out / Breaks</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="text-[12px] text-slate-500">
            {target.staffName ? <span className="font-semibold text-slate-700">{target.staffName}</span> : null}
            {target.staffName ? " · " : ""}
            {target.date} <span className="text-slate-400">(IST)</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-slate-600 mb-1">Check In</label>
              <input
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-[#FE5300]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-600 mb-1">Check Out</label>
              <input
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-[#FE5300]"
              />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-bold text-slate-600">Breaks</label>
              <button
                type="button"
                onClick={() => updateBreaks([...breakRows, { start: "", end: "" }])}
                className="text-[11px] font-bold text-[#FE5300] hover:text-orange-700"
              >
                + Add Break
              </button>
            </div>
            {breakRows.length === 0 ? (
              <p className="text-[11px] text-slate-400">No breaks.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {breakRows.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400 w-5 shrink-0">{i + 1}.</span>
                    <input
                      type="time"
                      value={b.start}
                      aria-label={`Break ${i + 1} start`}
                      onChange={(e) => updateBreaks(breakRows.map((r, idx) => (idx === i ? { ...r, start: e.target.value } : r)))}
                      className="flex-1 min-w-0 p-1.5 border border-slate-200 rounded text-sm outline-none focus:border-[#FE5300]"
                    />
                    <span className="text-slate-300 text-xs">to</span>
                    <input
                      type="time"
                      value={b.end}
                      aria-label={`Break ${i + 1} end`}
                      onChange={(e) => updateBreaks(breakRows.map((r, idx) => (idx === i ? { ...r, end: e.target.value } : r)))}
                      className="flex-1 min-w-0 p-1.5 border border-slate-200 rounded text-sm outline-none focus:border-[#FE5300]"
                    />
                    <button
                      type="button"
                      onClick={() => updateBreaks(breakRows.filter((_, idx) => idx !== i))}
                      aria-label={`Remove break ${i + 1}`}
                      className="text-slate-400 hover:text-red-600 text-sm px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Leave a break&apos;s end empty only if it&apos;s still ongoing (no check-out). Leave check-out empty if the staff member hasn&apos;t checked out. Hours and status (Present, or Late after the staff member&apos;s shift start + grace; 9:15 AM if no shift) are recalculated on save.</p>
          {error && <p className="text-[12px] font-medium text-red-600">{error}</p>}
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button className="px-4 py-2 rounded text-sm font-semibold border border-slate-200 hover:bg-slate-50 transition-colors" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 rounded text-sm font-semibold bg-[#FE5300] text-white hover:bg-orange-600 transition-colors" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Times"}
          </button>
        </div>
      </div>
    </div>
  );
}
