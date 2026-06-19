"use client";

import { useState, useEffect } from "react";
import { secureAdminFetch } from "@/lib/secureAdminFetch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";

export default function AdminLeaveTable() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance/leave`);
      const res = await response.json();
      if (res && res.success) {
        setRecords(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch leave records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (attendanceId: string, status: "Approved" | "Rejected") => {
    try {
      setActionLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance/leave/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId, status }),
      });
      const res = await response.json();
      if (res && res.success) {
        fetchRecords();
      }
    } catch (error) {
      console.error("Failed to update leave:", error);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
        <CardTitle className="text-[18px] font-bold text-slate-800 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#FE5300]" />
          Leave Applications
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading leave applications...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500">
            No leave applications found.
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden mt-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-none">
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Staff Name</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Date</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Leave Type</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Reason</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Status</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record._id} className="hover:bg-slate-50/80 transition-all duration-300 group cursor-default border-slate-100">
                    <TableCell className="py-2">
                      <div className="text-[13px] font-semibold text-slate-700 group-hover:translate-x-[1px] transition-transform duration-300">{record.staff?.name || 'Unknown'}</div>
                      <div className="text-[10px] font-medium text-slate-400 lowercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">{record.staff?.email}</div>
                    </TableCell>
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
                    <TableCell className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {record.leaveStatus === "Pending" && (
                          <>
                            <button 
                              onClick={() => handleApproveLeave(record._id, "Approved")}
                              disabled={actionLoading}
                              className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded font-bold hover:bg-green-100 transition-colors"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleApproveLeave(record._id, "Rejected")}
                              disabled={actionLoading}
                              className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded font-bold hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </>
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
    </Card>
  );
}
