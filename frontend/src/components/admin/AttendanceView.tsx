"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { secureAdminFetch } from "@/lib/secureAdminFetch";
import { toast } from "sonner";
import { MapPin, Clock, Coffee, CheckCircle2, PlayCircle, StopCircle, LogOut } from "lucide-react";
import { getAttendanceStatus } from "@/lib/attendanceUtils";
import { CameraModal } from "./CameraModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AttendanceView() {
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameraConfig, setCameraConfig] = useState<{ action: "check-in" | "check-out" | null, title: string }>({ action: null, title: "" });
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveType, setLeaveType] = useState("Leave");
  const [leaveReason, setLeaveReason] = useState("");
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  useEffect(() => {
    fetchTodayAttendance();
    fetchMyLeaves();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance/today`);
      const res = await response.json();
      if (res && res.success) {
        setAttendance(res.attendance);
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyLeaves = async () => {
    try {
      setLoadingLeaves(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance/leave/my`);
      const res = await response.json();
      if (res && res.success) {
        setMyLeaves(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch my leaves:", error);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        reject("Not supported");
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            toast.error("Unable to retrieve your location. Please allow location access.");
            reject(error);
          }
        );
      }
    });
  };

  const handleAction = async (action: "check-in" | "check-out" | "break/start" | "break/end", photoBase64?: string) => {
    try {
      setActionLoading(true);
      let payload: any = {};

      // Only check-in and check-out need location and photo
      if (action === "check-in" || action === "check-out") {
        try {
          const loc = await getLocation();
          payload = { ...loc, photo: photoBase64 };
        } catch (e) {
          setActionLoading(false);
          return; // Stop if location fails
        }
      }

      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await response.json();
      if (res && res.success) {
        toast.success(res.message);
        setAttendance(res.attendance);
      } else {
        toast.error(res?.message || "Action failed");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyLeave = async () => {
    try {
      setActionLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance/leave/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: leaveDate, endDate: leaveEndDate, leaveType, reason: leaveReason }),
      });
      const res = await response.json();
      if (res && res.success) {
        toast.success(res.message);
        setShowLeaveModal(false);
        fetchTodayAttendance();
        fetchMyLeaves();
        setLeaveDate(new Date().toISOString().split("T")[0]);
        setLeaveEndDate("");
      } else {
        toast.error(res?.message || "Action failed");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse">Loading attendance data...</div>;
  }

  const isCheckedIn = !!attendance?.checkInTime;
  const isCheckedOut = !!attendance?.checkOutTime;
  const isOnBreak = attendance?.breaks?.some((b: any) => !b.end);

  const formatTime = (dateString: string) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const statusInfo = getAttendanceStatus(attendance?.checkInTime, attendance?.date || new Date(), attendance?.leaveType, attendance?.leaveStatus);

  const getOngoingStats = () => {
    const formatMsToHHMM = (ms: number) => {
      if (ms < 0) return "0.00";
      const totalMins = Math.floor(ms / 60000);
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return `${hours}.${mins.toString().padStart(2, '0')}`;
    };

    if (!attendance || !attendance.checkInTime) {
      return { office: "0.00", working: "0.00", breaks: "0.00" };
    }
    if (attendance.checkOutTime) {
      const breaksMs = attendance.breaks?.reduce((acc: number, b: any) => {
        if (b.start && b.end) {
          return acc + (new Date(b.end).getTime() - new Date(b.start).getTime());
        }
        return acc;
      }, 0) || 0;
      return {
        office: attendance.totalOfficeHours?.toFixed(2) || "0.00",
        working: attendance.totalWorkingHours?.toFixed(2) || "0.00",
        breaks: formatMsToHHMM(breaksMs)
      };
    }
    const now = currentTime.getTime();
    const checkIn = new Date(attendance.checkInTime).getTime();
    const totalOfficeMs = Math.max(0, now - checkIn);
    let totalBreakMs = 0;
    if (attendance.breaks && Array.isArray(attendance.breaks)) {
      attendance.breaks.forEach((b: any) => {
        if (b.start) {
          const breakStart = new Date(b.start).getTime();
          const breakEnd = b.end ? new Date(b.end).getTime() : now;
          totalBreakMs += (breakEnd - breakStart);
        }
      });
    }
    const totalWorkingMs = Math.max(0, totalOfficeMs - totalBreakMs);
    return {
      office: formatMsToHHMM(totalOfficeMs),
      working: formatMsToHHMM(totalWorkingMs),
      breaks: formatMsToHHMM(totalBreakMs),
    };
  };

  const stats = getOngoingStats();

  return (
    <div className="w-full space-y-4">
      {/* Unified Dashboard Card */}
      <Card className="shadow-sm border-t-2 border-t-[#FE5300] border-x border-b border-slate-200 rounded-lg overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-4">
          <CardTitle className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-bold text-slate-800">Daily Attendance Panel</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <span className="text-[12px] font-semibold text-slate-500">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </CardTitle>
        </CardHeader>
        
        <div className="flex flex-col md:flex-row">
          {/* Left Column: Status Data */}
          <div className="w-full md:w-3/5 p-5 border-b md:border-b-0 md:border-r border-slate-100">
            <div className="flex flex-col mb-6 gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Summary</h3>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  {isCheckedOut ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 text-[#FE5300]" /> <span>Checked Out</span></>
                  ) : isOnBreak ? (
                    <><Coffee className="w-3.5 h-3.5 text-orange-500" /> <span className="text-orange-600">On Break</span></>
                  ) : isCheckedIn ? (
                    <><PlayCircle className="w-3.5 h-3.5 text-blue-500" /> <span className="text-blue-600">Working</span></>
                  ) : (
                    <><Clock className="w-3.5 h-3.5" /> <span>Not Checked In</span></>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-50/50 rounded-md p-3 border border-orange-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Office Hrs</span>
                  <span className="text-xl md:text-2xl font-bold text-slate-800">{stats.office} <span className="text-[11px] text-slate-500 font-semibold">h</span></span>
                </div>
                <div className="bg-orange-50/50 rounded-md p-3 border border-orange-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Working Hrs</span>
                  <span className="text-xl md:text-2xl font-bold text-[#FE5300]">{stats.working} <span className="text-[11px] text-[#FE5300]/70 font-semibold">h</span></span>
                </div>
                <div className="bg-orange-50/50 rounded-md p-3 border border-orange-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Break Time</span>
                  <span className="text-xl md:text-2xl font-bold text-orange-500">{stats.breaks} <span className="text-[11px] text-orange-500/70 font-semibold">h</span></span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-md p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><LogOut className="w-3 h-3 rotate-180" /> Check In</p>
                <p className="text-[14px] font-semibold text-slate-800">{formatTime(attendance?.checkInTime)}</p>
              </div>
              <div className="bg-slate-50 rounded-md p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><LogOut className="w-3 h-3" /> Check Out</p>
                <p className="text-[14px] font-semibold text-slate-800">{formatTime(attendance?.checkOutTime)}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Actions */}
          <div className="w-full md:w-2/5 p-5 bg-slate-50/50 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h3>
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => setShowLeaveModal(true)}>
                Apply Leave
              </Button>
            </div>
            
            <div className="space-y-3">
              {!isCheckedIn ? (
                <Button 
                  size="sm" 
                  className="w-full h-10 text-[12px] font-bold bg-[#FE5300] hover:bg-orange-600 transition-colors shadow-sm rounded-md" 
                  onClick={() => setCameraConfig({ action: "check-in", title: "Take a photo to Check In" })}
                  disabled={actionLoading}
                >
                  <MapPin className="mr-1.5 h-4 w-4" /> Check In
                </Button>
              ) : !isCheckedOut ? (
                <>
                  {!isOnBreak ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full h-10 text-[12px] font-semibold border-orange-200 text-[#FE5300] hover:bg-orange-50 transition-colors rounded-md" 
                      onClick={() => handleAction("break/start")}
                      disabled={actionLoading}
                    >
                      <Coffee className="mr-1.5 h-4 w-4" /> Start Break
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full h-10 text-[12px] font-semibold border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors rounded-md" 
                      onClick={() => handleAction("break/end")}
                      disabled={actionLoading}
                    >
                      <PlayCircle className="mr-1.5 h-4 w-4" /> End Break
                    </Button>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="w-full h-10 text-[12px] font-bold rounded-md" 
                    onClick={() => setCameraConfig({ action: "check-out", title: "Take a photo to Check Out" })}
                    disabled={actionLoading || isOnBreak}
                  >
                    <StopCircle className="mr-1.5 h-4 w-4" /> Check Out
                  </Button>
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 p-4 bg-orange-50 text-[#FE5300] rounded-md border border-orange-100">
                  <CheckCircle2 className="w-5 h-5 opacity-70" />
                  <p className="text-[12px] font-bold uppercase tracking-wide">Shift completed</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Breaks History (Only show if there are breaks) */}
      {attendance?.breaks && attendance.breaks.length > 0 && (
        <Card className="shadow-sm border border-slate-200 rounded-lg overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-2.5 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-[#FE5300]" /> Breaks Taken
            </CardTitle>
            <div className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
              TOTAL: {attendance.breaks.length}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {attendance.breaks.map((b: any, i: number) => (
                <div key={i} className="flex justify-between items-center px-4 py-3 bg-white hover:bg-orange-50/50 transition-colors group">
                  <div className="flex gap-4 items-center">
                    <span className="text-[12px] font-bold text-slate-700 w-16">Break {i + 1}</span>
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      {formatTime(b.start)} <span className="text-slate-300 mx-1">→</span> {formatTime(b.end) || 'Ongoing'}
                    </span>
                  </div>
                  {b.end && b.start && (
                    <span className="text-[11px] font-bold text-[#FE5300]">
                      {Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000)} mins
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="shadow-lg border-none mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
          <CardTitle className="text-[18px] font-bold text-slate-800 flex items-center gap-2">
            My Leave History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLeaves ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading leave history...</div>
          ) : myLeaves.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500">
              No leave applications found.
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden mt-4">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-none">
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Date</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Leave Type</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Reason</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myLeaves.map((record) => (
                    <TableRow key={record._id} className="hover:bg-slate-50/50 transition-all border-slate-100">
                      <TableCell className="py-2 text-[13px] font-medium text-slate-600">
                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-[12px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                          {record.leaveType}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <p className="text-[12px] text-slate-600 max-w-[200px] truncate" title={record.leaveReason || "No reason provided"}>
                          {record.leaveReason || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="py-2">
                        {record.leaveStatus === "Approved" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-purple-50 text-purple-600 border-purple-200">Approved</span>
                        ) : record.leaveStatus === "Pending" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-orange-50 text-orange-600 border-orange-200">Pending</span>
                        ) : record.leaveStatus === "Rejected" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-red-50 text-red-600 border-red-200">Rejected</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-slate-50 text-slate-500 border-slate-200">{record.leaveStatus}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {cameraConfig.action && (
        <CameraModal 
          title={cameraConfig.title}
          onCancel={() => setCameraConfig({ action: null, title: "" })}
          onCapture={(base64) => {
            const action = cameraConfig.action;
            setCameraConfig({ action: null, title: "" });
            if (action) handleAction(action, base64);
          }}
        />
      )}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Apply Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1">Start Date</label>
                  <input 
                    type="date" 
                    value={leaveDate}
                    min={new Date().toISOString().split("T")[0]}
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
              <Button variant="outline" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
              <Button className="bg-[#FE5300] hover:bg-orange-600" onClick={handleApplyLeave} disabled={actionLoading}>
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
