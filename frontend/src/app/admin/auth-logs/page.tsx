"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { format } from "date-fns";
import { Loader } from "@/components/custom/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from "@/components/common/Pagination";
import { KeyRound, Monitor, LogIn, LogOut, Search } from "lucide-react";

interface AuthLog {
  _id: string;
  user: {
    name: string;
    email: string;
    role: string;
    designation?: string;
  };
  eventType: string;
  ip: string;
  device: {
    browser: string;
    os: string;
    device: string;
  };
  timestamp: string;
}

export default function AuthLogsPage() {
  const token = useAdminAuthStore((state) => state.accessToken) ?? "";
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("all");
  const [sort, setSort] = useState("desc");
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["auth-logs", page, search, eventType, sort],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) queryParams.append("search", search.trim());
      if (eventType !== "all") queryParams.append("eventType", eventType);
      queryParams.append("sort", sort);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin/auth-logs?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch auth logs");
      return res.json();
    },
  });

  const getEventColor = (event: string) => {
    switch (event) {
      case "login": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "logout": return "text-orange-600 bg-orange-50 border-orange-200";
      default: return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  const getEventIcon = (event: string) => {
    switch (event) {
      case "login": return <LogIn className="w-3.5 h-3.5" />;
      case "logout": return <LogOut className="w-3.5 h-3.5" />;
      default: return <KeyRound className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-orange-600" />
            Staff Auth Logs
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Track staff and administrator login and logout activity securely.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Search Name or Email..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 w-[200px] h-8 text-xs font-medium bg-slate-50 border-0 focus-visible:ring-1 focus-visible:ring-[#FE5300] focus-visible:ring-offset-0"
            />
          </div>

          <Select value={eventType} onValueChange={(v) => { setEventType(v); setPage(1); }}>
            <SelectTrigger className="w-[120px] h-8 text-xs font-semibold bg-slate-50 border-0 focus:ring-1 focus:ring-[#FE5300] focus:ring-offset-0">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-8 text-xs font-semibold bg-slate-50 border-0 focus:ring-1 focus:ring-[#FE5300] focus:ring-offset-0">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            <Loader size="lg" message="Loading auth logs..." />
          </div>
        ) : isError ? (
          <div className="h-[200px] flex items-center justify-center text-red-500 font-semibold">
            Failed to load authentication logs. Please try again.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-wider pl-4 py-2">Timestamp</TableHead>
                  <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-wider py-2">Staff Member</TableHead>
                  <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-wider py-2">Event</TableHead>
                  <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-wider py-2">IP Address</TableHead>
                  <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-wider py-2">Device Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((log: AuthLog) => (
                  <TableRow 
                    key={log._id}
                    className="hover:bg-slate-50/80 transition-all duration-300 ease-in-out"
                  >
                    <TableCell className="pl-4 py-2 whitespace-nowrap text-[11px] text-slate-600 font-medium">
                      {format(new Date(log.timestamp), "MMM d, yyyy • h:mm a")}
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-800">{log.user?.name || "Unknown"}</span>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase">{log.user?.role || "Staff"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider border ${getEventColor(log.eventType)}`}>
                        {getEventIcon(log.eventType)}
                        {log.eventType}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm text-[10px] font-mono tracking-wide border border-slate-200">
                        {log.ip || "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                         <Monitor className="w-3.5 h-3.5 text-slate-400" />
                         <span>{log.device?.browser || "Unknown"}</span>
                         <span className="text-slate-300">•</span>
                         <span>{log.device?.os || "Unknown"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {data?.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-[200px] text-center text-slate-500 font-medium">
                      No authentication logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {data?.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
            Showing page <span className="text-slate-700">{page}</span> of{" "}
            <span className="text-slate-700">{data.totalPages}</span>
          </p>
          <Pagination
            currentPage={page}
            totalPages={data.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
