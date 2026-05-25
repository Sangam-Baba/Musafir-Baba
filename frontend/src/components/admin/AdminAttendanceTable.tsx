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
import { Search, Calendar as CalendarIcon, MapPin, Camera } from "lucide-react";

export default function AdminAttendanceTable() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const getActiveWorkingHours = (record: any) => {
    if (!record.checkInTime || record.checkOutTime) return null;
    const now = Date.now();
    const checkIn = new Date(record.checkInTime).getTime();
    let totalOfficeMs = now - checkIn;
    
    let totalBreakMs = 0;
    if (record.breaks && Array.isArray(record.breaks)) {
      record.breaks.forEach((b: any) => {
        if (b.start) {
          const breakStart = new Date(b.start).getTime();
          const breakEnd = b.end ? new Date(b.end).getTime() : now;
          totalBreakMs += (breakEnd - breakStart);
        }
      });
    }
    const workingHrs = (totalOfficeMs - totalBreakMs) / (1000 * 60 * 60);
    return workingHrs > 0 ? workingHrs.toFixed(2) : "0.00";
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
                      <div className="flex items-center gap-2">
                        <div className="text-[13px] font-semibold text-slate-700">{record.staff?.name || 'Unknown'}</div>
                        {record.breaks?.some((b: any) => !b.end) && (
                          <span className="bg-orange-100 text-orange-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">On Break</span>
                        )}
                      </div>
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
                    <TableCell className="py-2 text-[13px] font-medium text-slate-600">
                      <div className="flex items-center gap-2">
                        {record.checkInPhotoUrl && (
                          <button onClick={() => setPreviewImage(record.checkInPhotoUrl)} className="shrink-0" title="View Check-in Photo">
                            <img src={record.checkInPhotoUrl} alt="Check In" className="w-8 h-8 rounded-full object-cover border border-slate-200 hover:scale-110 transition-transform shadow-sm" />
                          </button>
                        )}
                        <span>{formatTime(record.checkInTime)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-[13px] font-medium text-slate-600">
                      <div className="flex items-center gap-2">
                        {record.checkOutPhotoUrl && (
                          <button onClick={() => setPreviewImage(record.checkOutPhotoUrl)} className="shrink-0" title="View Check-out Photo">
                            <img src={record.checkOutPhotoUrl} alt="Check Out" className="w-8 h-8 rounded-full object-cover border border-slate-200 hover:scale-110 transition-transform shadow-sm" />
                          </button>
                        )}
                        <span>{formatTime(record.checkOutTime)}</span>
                      </div>
                    </TableCell>
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
                    <TableCell className="py-2 text-[13px] font-semibold text-slate-600">
                      {record.totalOfficeHours || (record.checkInTime && !record.checkOutTime && dateFilter === new Date().toISOString().split("T")[0] ? (
                        <span className="text-blue-500 font-medium text-[12px]">
                          {((Date.now() - new Date(record.checkInTime).getTime()) / (1000 * 60 * 60)).toFixed(2)} hrs
                        </span>
                      ) : "-")}
                    </TableCell>
                    <TableCell className="py-2 text-[13px] font-bold text-[#FE5300]">
                      {record.totalWorkingHours || (record.checkInTime && !record.checkOutTime && dateFilter === new Date().toISOString().split("T")[0] ? (
                        <span className="text-orange-500 font-bold text-[12px]">
                          {getActiveWorkingHours(record)} hrs
                        </span>
                      ) : "-")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            <button 
              className="absolute top-4 right-4 md:-right-12 text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors"
              onClick={() => setPreviewImage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
