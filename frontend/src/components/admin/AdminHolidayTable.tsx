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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Trash2, Plus } from "lucide-react";

export default function AdminHolidayTable() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/holidays`);
      const res = await response.json();
      if (res && res.success) {
        setHolidays(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch holidays:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    try {
      setActionLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/holidays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHolidayName, date: newHolidayDate }),
      });
      const res = await response.json();
      if (res && res.success) {
        setNewHolidayName("");
        setNewHolidayDate("");
        fetchHolidays();
      } else {
        alert(res.message || "Failed to add holiday.");
      }
    } catch (error) {
      console.error("Failed to add holiday:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    try {
      setActionLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/holidays/${id}`, {
        method: "DELETE",
      });
      const res = await response.json();
      if (res && res.success) {
        fetchHolidays();
      }
    } catch (error) {
      console.error("Failed to delete holiday:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="w-full mt-4 space-y-8">
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div>
            <h2 className="text-[18px] font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#FE5300]" />
              Add New Public Holiday
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Registered holidays will automatically mark absent staff as "Holiday" on these dates.
            </p>
          </div>
        </div>
        <div className="pt-4">
          <form onSubmit={handleAddHoliday} className="flex flex-col md:flex-row items-end gap-4 pb-6">
            <div className="flex-1 w-full">
              <label className="block text-[12px] font-bold text-slate-600 mb-1">Holiday Name</label>
              <Input
                type="text"
                placeholder="e.g. Diwali, Christmas"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                className="bg-white border-slate-200 focus-visible:ring-[#FE5300]"
                required
              />
            </div>
            <div className="w-full md:w-[250px]">
              <label className="block text-[12px] font-bold text-slate-600 mb-1">Date</label>
              <Input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="bg-white border-slate-200 focus-visible:ring-[#FE5300]"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full md:w-auto bg-[#FE5300] hover:bg-orange-600 text-white font-bold h-10"
              disabled={actionLoading}
            >
              <Plus className="w-4 h-4 mr-2" /> {actionLoading ? "Adding..." : "Add Holiday"}
            </Button>
          </form>
        </div>
      </div>

      <div>
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-[18px] font-bold text-slate-800">Upcoming Holidays</h2>
        </div>
        <div className="pt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl text-slate-500">
              No public holidays registered.
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-none">
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Date</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Holiday Name</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => (
                    <TableRow key={holiday._id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                      <TableCell className="py-3">
                        <div className="text-[13px] font-semibold text-slate-700">{formatDate(holiday.date)}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="text-[13px] font-medium text-slate-600">{holiday.name}</div>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <button 
                          onClick={() => handleDeleteHoliday(holiday._id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                          title="Delete Holiday"
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
    </div>
  );
}
