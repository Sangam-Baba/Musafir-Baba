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
import { Calendar as CalendarIcon, MapPin, Info, Coffee, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminUserwiseAttendanceTable() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedBreaks, setSelectedBreaks] = useState<any[] | null>(null);

  useEffect(() => {
    fetchStaffList();
  }, []);

  useEffect(() => {
    if (selectedStaff && monthFilter) {
      fetchRecords();
    } else {
      setRecords([]);
    }
  }, [selectedStaff, monthFilter]);

  const fetchStaffList = async () => {
    try {
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin`);
      const res = await response.json();
      if (res && res.success) {
        setStaffList(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance/userwise?userId=${selectedStaff}&month=${monthFilter}`);
      const res = await response.json();
      if (res && res.success) {
        // Build a complete array of dates for the selected month
        const [year, month] = monthFilter.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        
        const completeRecords = [];
        for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${year}-${month}-${String(i).padStart(2, '0')}`;
          // Ensure exact match by mapping to ISO string date parts
          const existingRecord = res.data.find((r: any) => r.date.startsWith(dateStr));
          if (existingRecord) {
            completeRecords.push(existingRecord);
          } else {
            completeRecords.push({
              _id: `absent_${dateStr}`,
              date: dateStr,
              checkInTime: null,
              checkOutTime: null,
              breaks: [],
              totalOfficeHours: 0,
              totalWorkingHours: 0
            });
          }
        }
        // sort by date descending
        completeRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecords(completeRecords);
      }
    } catch (error) {
      console.error("Failed to fetch userwise attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatMsToHHMM = (ms: number) => {
    if (ms < 0) return "0.00";
    const totalMins = Math.floor(ms / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}.${mins.toString().padStart(2, '0')}`;
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
    const totalWorkingMs = totalOfficeMs - totalBreakMs;
    return formatMsToHHMM(totalWorkingMs);
  };

  return (
    <Card className="shadow-lg border-none mt-8">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <CardTitle className="text-[18px] font-bold text-slate-800">User-Wise Records</CardTitle>
        <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedStaff} onValueChange={setSelectedStaff}>
            <SelectTrigger className="w-[200px] h-8 bg-slate-50 border-0 shadow-none focus:ring-1 focus:ring-[#FE5300] text-[13px] font-semibold text-slate-700">
              <SelectValue placeholder="Select Staff Member" />
            </SelectTrigger>
            <SelectContent>
              {staffList.map((staff) => (
                <SelectItem key={staff._id} value={staff._id}>
                  {staff.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <Input 
              type="month" 
              value={monthFilter} 
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-auto h-8 bg-slate-50 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px] font-semibold text-slate-700"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedStaff ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500">
            Please select a staff member to view their records.
          </div>
        ) : loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading records...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500">
            No attendance records found for this period.
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-none">
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Date</TableHead>
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
                      <div className="text-[13px] font-semibold text-slate-700">{formatDate(record.date)}</div>
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
                      {record.totalOfficeHours?.toFixed(2) || (record.checkInTime && !record.checkOutTime && record.date.startsWith(new Date().toISOString().split("T")[0]) ? (
                        <span className="text-blue-500 font-medium text-[12px]">
                          {formatMsToHHMM(Date.now() - new Date(record.checkInTime).getTime())} hrs
                        </span>
                      ) : "-")}
                    </TableCell>
                    <TableCell className="py-2 text-[13px] font-bold text-[#FE5300]">
                      <div className="flex items-center gap-2">
                        {record.totalWorkingHours?.toFixed(2) || (record.checkInTime && !record.checkOutTime && record.date.startsWith(new Date().toISOString().split("T")[0]) ? (
                          <span className="text-orange-500 font-bold text-[12px]">
                            {getActiveWorkingHours(record)} hrs
                          </span>
                        ) : "-")}
                        {record.breaks && record.breaks.length > 0 && (
                          <button onClick={() => setSelectedBreaks(record.breaks)} className="text-slate-400 hover:text-[#FE5300] transition-colors" title="View Breaks">
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
      {selectedBreaks && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedBreaks(null)}>
          <div className="relative max-w-sm w-full bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
                <Coffee className="w-4 h-4 text-[#FE5300]" /> Breaks Breakdown
              </h3>
              <button onClick={() => setSelectedBreaks(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
              {selectedBreaks.map((b: any, i: number) => (
                <div key={i} className="flex justify-between items-center px-4 py-3 bg-white hover:bg-orange-50/50 transition-colors group">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-slate-700">Break {i + 1}</span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {formatTime(b.start)} <span className="text-slate-300 mx-1">→</span> {formatTime(b.end) || 'Ongoing'}
                    </span>
                  </div>
                  {b.end && b.start && (
                    <span className="text-[11px] font-bold text-[#FE5300] bg-orange-50 px-2 py-1 rounded border border-orange-100">
                      {Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000)} mins
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
