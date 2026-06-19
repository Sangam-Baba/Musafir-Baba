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
import { Search, Calendar as CalendarIcon, MapPin, Camera, Info, Coffee, X } from "lucide-react";

export default function AdminAttendanceTable() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedBreaks, setSelectedBreaks] = useState<any[] | null>(null);
  const [showMarkLeaveModal, setShowMarkLeaveModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveType, setLeaveType] = useState("Leave");
  const [leaveReason, setLeaveReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleMarkLeave = async () => {
    if (!selectedStaffId) return;
    try {
      setActionLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance/leave/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedStaffId, date: leaveDate || dateFilter, endDate: leaveEndDate, leaveType, reason: leaveReason }),
      });
      const res = await response.json();
      if (res && res.success) {
        setShowMarkLeaveModal(false);
        fetchRecords();
      }
    } catch (error) {
      console.error("Failed to mark leave:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
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
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record._id} className="hover:bg-slate-50/80 transition-all duration-300 group cursor-default border-slate-100">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2 group-hover:translate-x-[1px] transition-transform duration-300">
                        <div className="text-[13px] font-semibold text-slate-700">{record.staff?.name || 'Unknown'}</div>
                        {record.breaks?.some((b: any) => !b.end) && (
                          <span className="bg-orange-100 text-orange-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">On Break</span>
                        )}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 lowercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">{record.staff?.email}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      {(() => {
                        const status = getAttendanceStatus(record.checkInTime, record.date, record.leaveType, record.leaveStatus);
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
                      {record.totalOfficeHours ? record.totalOfficeHours.toFixed(2) : (record.checkInTime && !record.checkOutTime && dateFilter === new Date().toISOString().split("T")[0] ? (
                        <span className="text-blue-500 font-medium text-[12px]">
                          {formatMsToHHMM(Date.now() - new Date(record.checkInTime).getTime())} hrs
                        </span>
                      ) : "0.00")}
                    </TableCell>
                    <TableCell className="py-2 text-[13px] font-bold text-[#FE5300]">
                      <div className="flex items-center gap-2">
                        {record.totalWorkingHours ? record.totalWorkingHours.toFixed(2) : (record.checkInTime && !record.checkOutTime && dateFilter === new Date().toISOString().split("T")[0] ? (
                          <span className="text-orange-500 font-bold text-[12px]">
                            {getActiveWorkingHours(record)} hrs
                          </span>
                        ) : "0.00")}
                        {record.breaks && record.breaks.length > 0 && (
                          <button onClick={() => setSelectedBreaks(record.breaks)} className="text-slate-400 hover:text-[#FE5300] transition-colors" title="View Breaks">
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(!record.leaveType || record.leaveType === "none" || record.leaveStatus === "none") && record.staff && (
                          <button 
                            onClick={() => {
                              setSelectedStaffId(record.staff._id || record.staff.id || (record._id.startsWith("absent_") ? record._id.replace("absent_", "") : record.staff));
                              setLeaveDate(dateFilter);
                              setLeaveEndDate("");
                              setLeaveReason("");
                              setShowMarkLeaveModal(true);
                            }}
                            disabled={actionLoading}
                            className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded font-bold hover:bg-slate-100 transition-colors"
                          >
                            Mark Leave
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
      {showMarkLeaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Mark Leave</h3>
              <button onClick={() => setShowMarkLeaveModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1">Start Date</label>
                  <input 
                    type="date" 
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-[#FE5300]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1">End Date (Optional)</label>
                  <input 
                    type="date" 
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    min={leaveDate}
                    className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-[#FE5300]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-600 mb-1">Leave Type</label>
                <select 
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-[#FE5300]"
                >
                  <option value="Leave">Leave</option>
                  <option value="Short Leave">Short Leave</option>
                  <option value="Half Day">Half Day</option>
                  <option value="WFH">Work From Home (WFH)</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-600 mb-1">Reason (Optional)</label>
                <textarea 
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Reason for leave..."
                  className="w-full p-2 border border-slate-200 rounded text-sm outline-none focus:border-[#FE5300] min-h-[80px]"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
              <button className="px-4 py-2 rounded text-sm font-semibold border border-slate-200 hover:bg-slate-50 transition-colors" onClick={() => setShowMarkLeaveModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded text-sm font-semibold bg-[#FE5300] text-white hover:bg-orange-600 transition-colors" onClick={handleMarkLeave} disabled={actionLoading}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
