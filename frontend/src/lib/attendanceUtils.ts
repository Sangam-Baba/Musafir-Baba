export const getAttendanceStatus = (checkInTime: string | null | undefined, recordDate: string | Date = new Date(), leaveType?: string, leaveStatus?: string, attendanceStatus?: string) => {
  const targetDate = new Date(recordDate);
  const now = new Date();

  // If there's a leave type, and it's NOT Approved yet, show Pending/Rejected
  if (leaveType && leaveType !== "none" && leaveStatus !== "Approved") {
    if (leaveStatus === "Pending") {
      return { label: `${leaveType} (Pending)`, color: "bg-orange-50 text-orange-600 border-orange-200" };
    } else if (leaveStatus === "Rejected") {
      return { label: `${leaveType} (Rejected)`, color: "bg-red-50 text-red-600 border-red-200" };
    }
  }

  // Use the database's explicit attendanceStatus as the single source of truth
  switch(attendanceStatus) {
    case "Present": return { label: "Present", color: "bg-green-50 text-green-600 border-green-200" };
    case "Late": return { label: "Late", color: "bg-yellow-50 text-yellow-600 border-yellow-200" };
    case "Absent": return { label: "Absent", color: "bg-red-50 text-red-600 border-red-200" };
    case "Leave": return { label: "On Leave", color: "bg-purple-50 text-purple-600 border-purple-200" };
    case "Short Leave": return { label: "Short Leave", color: "bg-purple-50 text-purple-600 border-purple-200" };
    case "Half Day": return { label: "Half Day", color: "bg-purple-50 text-purple-600 border-purple-200" };
    case "WFH": return { label: "WFH", color: "bg-blue-50 text-blue-600 border-blue-200" };
    case "Holiday": return { label: "Holiday", color: "bg-purple-50 text-purple-600 border-purple-200" };
    case "Weekend": return { label: "Weekend", color: "bg-slate-50 text-slate-500 border-slate-200" };
  }

  // Fallback for today if there is no checkInTime and no explicit status saved yet (i.e., Pending check-in for today)
  if (!checkInTime) {
    const isToday = targetDate.toDateString() === now.toDateString();
    if (isToday) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      if (currentHour > 9 || (currentHour === 9 && currentMinute > 30)) {
        return { label: "Absent", color: "bg-red-50 text-red-600 border-red-200" };
      }
      return { label: "Pending", color: "bg-slate-50 text-slate-500 border-slate-200" };
    }
  }

  return { label: "Absent", color: "bg-red-50 text-red-600 border-red-200" };
};
