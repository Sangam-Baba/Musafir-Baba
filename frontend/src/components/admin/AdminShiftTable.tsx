"use client";

import { useState, useEffect } from "react";
import { secureAdminFetch } from "@/lib/secureAdminFetch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, Trash2, Plus, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Shift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
}

interface ShiftStaff {
  _id: string;
  name: string;
  email: string;
  designation?: string;
  shift?: string | null;
}

const EMPTY_FORM = { name: "", startTime: "09:00", endTime: "18:00", graceMinutes: 15 };

const addMinutes = (hhmm: string, mins: number) => {
  const total = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function AdminShiftTable() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<ShiftStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [bulkShiftId, setBulkShiftId] = useState("");

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/shifts`);
      const res = await response.json();
      if (res && res.success) {
        setShifts(res.data.shifts);
        setStaff(res.data.staff);
      } else {
        toast.error(res?.message || "Failed to load shifts.");
      }
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.endTime <= form.startTime) {
      toast.error("End time must be after start time.");
      return;
    }
    try {
      setActionLoading(true);
      const url = editId
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/shifts/${editId}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/shifts`;
      const response = await secureAdminFetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, graceMinutes: Number(form.graceMinutes) }),
      });
      const res = await response.json();
      if (res && res.success) {
        toast.success(res.message);
        resetForm();
        fetchShifts();
      } else {
        toast.error(res?.message || "Failed to save shift.");
      }
    } catch (error) {
      console.error("Failed to save shift:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditId(shift._id);
    setForm({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime, graceMinutes: shift.graceMinutes });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;
    try {
      setActionLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/shifts/${id}`, {
        method: "DELETE",
      });
      const res = await response.json();
      if (res && res.success) {
        toast.success(res.message);
        if (editId === id) resetForm();
        fetchShifts();
      } else {
        toast.error(res?.message || "Failed to delete shift.");
      }
    } catch (error) {
      console.error("Failed to delete shift:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const assign = async (staffIds: string[], shiftId: string | null) => {
    try {
      setActionLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/shifts/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffIds, shiftId }),
      });
      const res = await response.json();
      if (res && res.success) {
        toast.success(res.message);
        fetchShifts();
      } else {
        toast.error(res?.message || "Failed to assign shift.");
      }
    } catch (error) {
      console.error("Failed to assign shift:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const shiftIds = new Set(shifts.map((s) => s._id));
  // A reference to a deleted shift counts as unassigned (backend falls back to 9:15 too)
  const unassigned = staff.filter((s) => !s.shift || !shiftIds.has(s.shift));
  const countFor = (id: string) => staff.filter((s) => s.shift === id).length;

  return (
    <div className="w-full mt-4 space-y-8">
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div>
            <h2 className="text-[18px] font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#FE5300]" />
              {editId ? "Edit Shift" : "Add New Shift"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Staff are marked Late when they check in after their shift start time + grace minutes.
            </p>
          </div>
        </div>
        <div className="pt-4">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-end gap-4 pb-2">
            <div className="flex-1 w-full">
              <label className="block text-[12px] font-bold text-slate-600 mb-1">Shift Name</label>
              <Input
                type="text"
                placeholder="e.g. Morning Shift"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white border-slate-200 focus-visible:ring-[#FE5300]"
                required
              />
            </div>
            <div className="w-full md:w-[140px]">
              <label className="block text-[12px] font-bold text-slate-600 mb-1">Start Time</label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="bg-white border-slate-200 focus-visible:ring-[#FE5300]"
                required
              />
            </div>
            <div className="w-full md:w-[140px]">
              <label className="block text-[12px] font-bold text-slate-600 mb-1">End Time</label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="bg-white border-slate-200 focus-visible:ring-[#FE5300]"
                required
              />
            </div>
            <div className="w-full md:w-[130px]">
              <label className="block text-[12px] font-bold text-slate-600 mb-1">Grace (minutes)</label>
              <Input
                type="number"
                min={0}
                max={180}
                step={1}
                value={form.graceMinutes}
                onChange={(e) => setForm({ ...form, graceMinutes: Number(e.target.value) })}
                className="bg-white border-slate-200 focus-visible:ring-[#FE5300]"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full md:w-auto bg-[#FE5300] hover:bg-orange-600 text-white font-bold h-10"
              disabled={actionLoading}
            >
              {editId ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {actionLoading ? "Saving..." : editId ? "Update Shift" : "Add Shift"}
            </Button>
            {editId && (
              <Button type="button" variant="outline" onClick={resetForm} className="w-full md:w-auto h-10">
                Cancel
              </Button>
            )}
          </form>
          {/^\d{2}:\d{2}$/.test(form.startTime) && (
            <p className="text-[11px] text-slate-400 pb-4">
              Late after {addMinutes(form.startTime, Number(form.graceMinutes) || 0)}. Shifts can&apos;t cross midnight.
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-[18px] font-bold text-slate-800">Shifts</h2>
        </div>
        <div className="pt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading shifts...</div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl text-slate-500">
              No shifts created yet. Everyone uses the default 9:15 AM late rule.
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-none">
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Shift</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Timing</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Late After</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Staff</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift._id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                      <TableCell className="py-3">
                        <div className="text-[13px] font-semibold text-slate-700">{shift.name}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="text-[13px] font-medium text-slate-600">{shift.startTime} – {shift.endTime}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="text-[13px] font-medium text-slate-600">
                          {addMinutes(shift.startTime, shift.graceMinutes)}
                          <span className="text-slate-400"> ({shift.graceMinutes} min grace)</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="text-[13px] font-medium text-slate-600">{countFor(shift._id)}</div>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <button
                          onClick={() => handleEdit(shift)}
                          className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2 rounded transition-colors"
                          title="Edit Shift"
                          disabled={actionLoading}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(shift._id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                          title="Delete Shift"
                          disabled={actionLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-[18px] font-bold text-slate-800">Staff Shift Allocation</h2>
          <p className="text-sm text-slate-500 mt-1">Every attendance-eligible staff member should be allocated a shift.</p>
        </div>
        <div className="pt-4 space-y-4">
          {!loading && unassigned.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 text-[13px] font-medium text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {unassigned.length} staff member(s) have no shift. They use the default 9:15 AM late rule until assigned.
              </div>
              {shifts.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={bulkShiftId}
                    onChange={(e) => setBulkShiftId(e.target.value)}
                    className="h-8 bg-white border border-amber-200 focus:outline-none focus:ring-1 focus:ring-[#FE5300] rounded px-2 text-[13px] text-slate-700"
                  >
                    <option value="">Select shift</option>
                    {shifts.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    disabled={!bulkShiftId || actionLoading}
                    onClick={() => assign(unassigned.map((s) => s._id), bulkShiftId)}
                    className="h-8 bg-[#FE5300] hover:bg-orange-600 text-white text-[13px] font-semibold"
                  >
                    Assign to all unassigned
                  </Button>
                </div>
              )}
            </div>
          )}

          {!loading && staff.length > 0 && (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-none">
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Staff</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Designation</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Shift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => {
                    const current = member.shift && shiftIds.has(member.shift) ? member.shift : "";
                    return (
                      <TableRow key={member._id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                        <TableCell className="py-3">
                          <div className="text-[13px] font-semibold text-slate-700">{member.name}</div>
                          <div className="text-[11px] text-slate-400">{member.email}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="text-[13px] font-medium text-slate-600">{member.designation || "-"}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <select
                            value={current}
                            disabled={actionLoading}
                            onChange={(e) => assign([member._id], e.target.value || null)}
                            className={`h-8 border focus:outline-none focus:ring-1 focus:ring-[#FE5300] rounded px-2 text-[13px] ${current ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-amber-50 border-amber-200 text-amber-800"}`}
                          >
                            <option value="">No shift (default 9:15 AM)</option>
                            {shifts.map((s) => (
                              <option key={s._id} value={s._id}>{s.name} ({s.startTime} – {s.endTime})</option>
                            ))}
                          </select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
