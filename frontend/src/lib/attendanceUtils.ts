export const getAttendanceStatus = (checkInTime: string | null | undefined, recordDate: string | Date = new Date()) => {
  const targetDate = new Date(recordDate);
  const now = new Date();
  
  if (!checkInTime) {
    const isToday = targetDate.toDateString() === now.toDateString();
    if (isToday) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      if (currentHour > 9 || (currentHour === 9 && currentMinute > 30)) {
        return { label: "Absent", color: "bg-red-50 text-red-600 border-red-200" };
      }
      return { label: "Pending", color: "bg-slate-50 text-slate-500 border-slate-200" };
    } else {
      return { label: "Absent", color: "bg-red-50 text-red-600 border-red-200" };
    }
  }

  const checkIn = new Date(checkInTime);
  const hour = checkIn.getHours();
  const minute = checkIn.getMinutes();

  if (hour < 9 || (hour === 9 && minute <= 15)) {
    return { label: "On Time", color: "bg-green-50 text-green-600 border-green-200" };
  } else {
    return { label: "Late", color: "bg-yellow-50 text-yellow-600 border-yellow-200" };
  }
};
