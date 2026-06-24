"use client";

import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceView from "@/components/admin/AttendanceView";
import AdminAttendanceTable from "@/components/admin/AdminAttendanceTable";
import AdminUserwiseAttendanceTable from "@/components/admin/AdminUserwiseAttendanceTable";
import AdminLeaveTable from "@/components/admin/AdminLeaveTable";
import AdminHolidayTable from "@/components/admin/AdminHolidayTable";
import AdminMonthlyReport from "@/components/admin/AdminMonthlyReport";

export default function AttendancePage() {
  const role = useAdminAuthStore((state) => state.role);
  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <div className="w-full h-full p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attendance Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your daily attendance, breaks, and view records.
          </p>
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="my-attendance" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full bg-slate-100/50 p-0.5 rounded-lg h-auto md:h-9 mb-6">
            <TabsTrigger value="my-attendance" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#FE5300] data-[state=active]:shadow-sm py-1.5 md:py-0">My Attendance</TabsTrigger>
            <TabsTrigger value="all-attendance" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#FE5300] data-[state=active]:shadow-sm py-1.5 md:py-0">All Staff Records</TabsTrigger>
            <TabsTrigger value="monthly-report" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#FE5300] data-[state=active]:shadow-sm py-1.5 md:py-0">Monthly Report</TabsTrigger>
            <TabsTrigger value="leave-applications" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#FE5300] data-[state=active]:shadow-sm py-1.5 md:py-0">Leave Applications</TabsTrigger>
            <TabsTrigger value="holidays" className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#FE5300] data-[state=active]:shadow-sm py-1.5 md:py-0">Holidays</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-attendance" className="mt-0">
            <AttendanceView />
          </TabsContent>
          
          <TabsContent value="all-attendance" className="mt-0 space-y-8">
            <AdminAttendanceTable />
            <AdminUserwiseAttendanceTable />
          </TabsContent>

          <TabsContent value="monthly-report" className="mt-0">
            <AdminMonthlyReport />
          </TabsContent>

          <TabsContent value="leave-applications" className="mt-0">
            <AdminLeaveTable />
          </TabsContent>

          <TabsContent value="holidays" className="mt-0">
            <AdminHolidayTable />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="pt-4">
          <AttendanceView />
        </div>
      )}
    </div>
  );
}
