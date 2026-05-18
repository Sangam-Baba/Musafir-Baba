"use client";

import { useState, useEffect } from "react";
import { secureAdminFetch } from "@/lib/secureAdminFetch";
import { getAttendanceStatus } from "@/lib/attendanceUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Calendar as CalendarIcon, MapPin } from "lucide-react";

export default function AdminAttendanceTable() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchRecords();
  }, [dateFilter]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance?date=${dateFilter}`);
      const res = await response.json();
      if (res && res.success) {
        setRecords(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch attendance records:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
        <CardTitle className="text-[18px] font-bold text-slate-800">All Staff Attendance</CardTitle>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          <Input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto h-8 bg-slate-50 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px] font-semibold text-slate-700"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading records...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500">
            No attendance records found for {dateFilter}
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-none">
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Staff Name</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Status</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Check In</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Check Out</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Distance (In/Out)</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Total Hrs</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Working Hrs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record._id} className="hover:bg-orange-50/50 transition-all duration-300 hover:translate-x-[1px] group cursor-default border-slate-100">
                    <TableCell className="py-2">
                      <div className="text-[13px] font-semibold text-slate-700">{record.staff?.name || 'Unknown'}</div>
                      <div className="text-[10px] font-medium text-slate-400 lowercase">{record.staff?.email}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      {(() => {
                        const status = getAttendanceStatus(record.checkInTime, record.date);
                        return (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${status.color}`}>
                            {status.label}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-2 text-[13px] font-medium text-slate-600">{formatTime(record.checkInTime)}</TableCell>
                    <TableCell className="py-2 text-[13px] font-medium text-slate-600">{formatTime(record.checkOutTime)}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-1 text-[11px] font-medium text-slate-500 capitalize">
                        {record.checkInLocation?.distance !== undefined && (
                          <span className="flex items-center gap-1 group-hover:text-[#FE5300] transition-colors">
                            <MapPin className="w-3 h-3" /> In: {record.checkInLocation.distance.toFixed(2)} km
                          </span>
                        )}
                        {record.checkOutLocation?.distance !== undefined && (
                          <span className="flex items-center gap-1 group-hover:text-[#FE5300] transition-colors">
                            <MapPin className="w-3 h-3" /> Out: {record.checkOutLocation.distance.toFixed(2)} km
                          </span>
                        )}
                        {!record.checkInLocation?.distance && !record.checkOutLocation?.distance && "-"}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-[13px] font-semibold text-slate-600">{record.totalOfficeHours || "-"}</TableCell>
                    <TableCell className="py-2 text-[13px] font-bold text-[#FE5300]">{record.totalWorkingHours || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
