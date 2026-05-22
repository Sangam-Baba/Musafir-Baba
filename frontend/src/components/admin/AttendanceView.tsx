"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { secureAdminFetch } from "@/lib/secureAdminFetch";
import { toast } from "sonner";
import { MapPin, Clock, Coffee, CheckCircle2, PlayCircle, StopCircle, LogOut } from "lucide-react";
import { getAttendanceStatus } from "@/lib/attendanceUtils";
import { CameraModal } from "./CameraModal";

export default function AttendanceView() {
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameraConfig, setCameraConfig] = useState<{ action: "check-in" | "check-out" | null, title: string }>({ action: null, title: "" });

  useEffect(() => {
    fetchTodayAttendance();
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

  const statusInfo = getAttendanceStatus(attendance?.checkInTime, attendance?.date || new Date());

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
            <div className="flex items-center justify-between mb-6">
              <div className="text-3xl font-bold tracking-tight text-slate-800">
                {currentTime.toLocaleTimeString()}
              </div>
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

            {isCheckedOut && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-orange-50/50 rounded-md p-3 border border-orange-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Office Hours</span>
                  <span className="text-[14px] font-semibold text-slate-800">{attendance.totalOfficeHours} <span className="text-[11px] text-slate-500">hrs</span></span>
                </div>
                <div className="bg-orange-50/50 rounded-md p-3 border border-orange-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Working Hours</span>
                  <span className="text-[14px] font-bold text-[#FE5300]">{attendance.totalWorkingHours} <span className="text-[11px] text-[#FE5300]/70">hrs</span></span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Actions */}
          <div className="w-full md:w-2/5 p-5 bg-slate-50/50 flex flex-col justify-center">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h3>
            
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
    </div>
  );
}
