"use client";

import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceView from "@/components/admin/AttendanceView";
import AdminAttendanceTable from "@/components/admin/AdminAttendanceTable";
import AdminUserwiseAttendanceTable from "@/components/admin/AdminUserwiseAttendanceTable";
import AdminLeaveTable from "@/components/admin/AdminLeaveTable";

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
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
            <TabsTrigger value="my-attendance">My Attendance</TabsTrigger>
            <TabsTrigger value="all-attendance">All Staff Records</TabsTrigger>
            <TabsTrigger value="leave-applications">Leave Applications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-attendance" className="mt-0">
            <AttendanceView />
          </TabsContent>
          
          <TabsContent value="all-attendance" className="mt-0 space-y-8">
            <AdminAttendanceTable />
            <AdminUserwiseAttendanceTable />
          </TabsContent>

          <TabsContent value="leave-applications" className="mt-0">
            <AdminLeaveTable />
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
