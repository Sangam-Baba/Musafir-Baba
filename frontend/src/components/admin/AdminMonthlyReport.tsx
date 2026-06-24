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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Calculator, Download } from "lucide-react";

export default function AdminMonthlyReport() {
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (monthFilter) {
      fetchReport();
    }
  }, [monthFilter]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/attendance/monthly-report?month=${monthFilter}`);
      const res = await response.json();
      if (res && res.success) {
        setReportData(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch monthly report:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkingDays = (record: any) => {
    // 1. Calculate Total Leaves Taken (Full Leaves + Absents + 0.5 per Half Day + 0.5 per Late)
    const totalLeavesTaken = record.leaveCount + record.absentCount + ((record.halfDayCount + record.lateCount) * 0.5);
    
    // 2. Calculate Unpaid Leaves (Leaves exceeding the allowed balance)
    const unpaidLeaves = Math.max(0, totalLeavesTaken - record.staff.totalLeaveBalance);

    // 3. Final Working Days = Base Days minus Unpaid Leaves
    const days = record.daysInMonth - unpaidLeaves;

    return Math.max(0, days);
  };

  const handleDownloadCSV = () => {
    if (!reportData || reportData.length === 0) return;

    const headers = [
      "Staff Name",
      "Email",
      "Base Days",
      "Present",
      "Late",
      "WFH",
      "Short Lvl",
      "Half Day",
      "Leave/Abs",
      "Holiday",
      "Leave Config",
      "Calc. Working Days"
    ];

    const rows = reportData.map(record => {
      const workingDays = calculateWorkingDays(record);
      const totalAbsences = record.leaveCount + record.absentCount + ((record.halfDayCount + record.lateCount) * 0.5);
      
      return [
        `"${record.staff.name}"`, // Quotes to handle commas in names
        record.staff.email,
        record.daysInMonth,
        record.presentCount,
        record.lateCount,
        record.wfhCount,
        record.shortLeaveCount,
        record.halfDayCount,
        totalAbsences,
        record.holidayCount,
        record.staff.totalLeaveBalance,
        workingDays.toFixed(1)
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Monthly_Report_${monthFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full mt-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-[#FE5300]" />
          <h2 className="text-[18px] font-bold text-slate-800">Monthly Working Days Report</h2>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleDownloadCSV}
            disabled={loading || reportData.length === 0}
            className="bg-[#FE5300] hover:bg-orange-600 text-white font-semibold flex items-center gap-2 text-sm h-8"
          >
            <Download className="w-4 h-4" />
            Download Sheet
          </Button>
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
      </div>
      <div className="pt-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading report data...</div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl text-slate-500">
            No data available for this month.
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-none">
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Staff Name</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-center">Base Days</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-center">Present</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-center">Late</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-center">WFH</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-center">Short Lvl</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-center">Half Day</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-center">Leave/Abs</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-center">Holiday</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-center">Leave Config</TableHead>
                  <TableHead className="text-[11px] font-bold text-[#FE5300] bg-orange-50 uppercase tracking-wider py-3 text-right">Calc. Working Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((record) => {
                  const workingDays = calculateWorkingDays(record);
                  const totalAbsences = record.leaveCount + record.absentCount + ((record.halfDayCount + record.lateCount) * 0.5);
                  
                  return (
                    <TableRow key={record.staff._id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                      <TableCell className="py-3">
                        <div className="text-[13px] font-semibold text-slate-700">{record.staff.name}</div>
                        <div className="text-[11px] text-slate-400">{record.staff.email}</div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="text-[13px] font-bold text-slate-500">{record.daysInMonth}</div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="text-[13px] font-medium text-slate-600">{record.presentCount}</div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="text-[13px] font-medium text-slate-600">{record.lateCount}</div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="text-[13px] font-medium text-slate-600">{record.wfhCount}</div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="text-[13px] font-medium text-slate-600">{record.shortLeaveCount}</div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="text-[13px] font-medium text-slate-600">{record.halfDayCount}</div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="text-[13px] font-medium text-red-500">{totalAbsences}</div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="text-[13px] font-medium text-slate-600">{record.holidayCount}</div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="text-[13px] font-medium text-slate-600">{record.staff.totalLeaveBalance}</div>
                      </TableCell>
                      <TableCell className="py-3 text-right bg-orange-50/30">
                        <div className="text-[15px] font-black text-[#FE5300]">{workingDays.toFixed(1)}</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
