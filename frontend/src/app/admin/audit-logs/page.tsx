"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { format } from "date-fns";
import { Loader } from "@/components/custom/loader";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/common/Pagination";
import { Activity, Search, ServerCrash, CheckCircle2, ShieldAlert } from "lucide-react";

interface AuditLog {
  _id: string;
  userName: string;
  role: string;
  actionType: string;
  moduleName: string;
  documentTitle?: string;
  description: string;
  changes: any;
  metadata: any;
  createdAt: string;
}

const StructuredPayloadDisplay = ({ changes }: { changes: any }) => {
  if (!changes) return <p className="text-sm text-slate-500 italic">No payload recorded.</p>;

  const { oldValue, newValue } = changes;
  
  if (!oldValue && newValue) {
    return (
      <div className="space-y-1">
        {Object.entries(newValue).map(([key, val]) => {
          if(key === "_id" || key === "__v" || key === "createdAt" || key === "updatedAt") return null;
          let displayVal = val;
          if (typeof val === "object") displayVal = "[Object/Array]";
          return (
            <div key={key} className="grid grid-cols-3 border-b border-slate-100 py-2.5">
              <span className="col-span-1 text-xs font-semibold text-slate-500 capitalize">{key}</span>
              <span className="col-span-2 text-xs font-medium text-slate-800 break-words">{String(displayVal)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (oldValue && newValue) {
    const allKeys = Array.from(new Set([...Object.keys(oldValue), ...Object.keys(newValue)]));
    
    return (
      <div className="space-y-1">
        {allKeys.map((key) => {
          if(key === "_id" || key === "__v" || key === "createdAt" || key === "updatedAt") return null;
          const oldVal = oldValue[key];
          const newVal = newValue[key];
          
          const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);
          if (!isChanged) return null; 

          let displayOld = typeof oldVal === "object" ? "[Object]" : String(oldVal);
          let displayNew = typeof newVal === "object" ? "[Object]" : String(newVal);

          return (
            <div key={key} className="flex flex-col border-b border-slate-100 py-3 gap-2">
              <span className="text-xs font-semibold text-slate-800 capitalize">{key}</span>
              <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-start gap-2">
                   <span className="text-[10px] font-bold text-slate-400 uppercase w-8 mt-0.5">Old</span>
                   <span className="text-xs font-medium text-slate-500 line-through break-all">{displayOld === "undefined" ? "null" : displayOld}</span>
                </div>
                <div className="flex items-start gap-2">
                   <span className="text-[10px] font-bold text-emerald-500 uppercase w-8 mt-0.5">New</span>
                   <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1 rounded break-all">{displayNew === "undefined" ? "null" : displayNew}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <pre className="text-[11px] font-mono whitespace-pre-wrap text-slate-600 bg-slate-50 p-4 rounded-xl">{JSON.stringify(changes, null, 2)}</pre>;
};

export default function AuditLogsPage() {
  const token = useAdminAuthStore((state) => state.accessToken) ?? "";
  const role = useAdminAuthStore((state) => state.role);
  
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", page, moduleFilter, actionFilter, search, role],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (moduleFilter !== "all") queryParams.append("moduleName", moduleFilter);
      if (actionFilter !== "all") queryParams.append("actionType", actionFilter);
      if (search.trim()) queryParams.append("search", search.trim());

      const endpoint = role === "superadmin" || role === "admin" ? "/audit/all" : "/audit/my-history";

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}${endpoint}?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE": return "text-green-600 bg-green-50 border-green-200";
      case "UPDATE": return "text-blue-600 bg-blue-50 border-blue-200";
      case "DELETE": return "text-red-600 bg-red-50 border-red-200";
      case "LOGIN": return "text-purple-600 bg-purple-50 border-purple-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE": return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "UPDATE": return <Activity className="w-3.5 h-3.5" />;
      case "DELETE": return <ShieldAlert className="w-3.5 h-3.5" />;
      default: return <ServerCrash className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-orange-600" />
            System Audit Logs
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Track user activity, modifications, and system events.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Search by Title..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 w-[180px] h-8 text-xs font-medium bg-slate-50 border-0 focus-visible:ring-1 focus-visible:ring-[#FE5300] focus-visible:ring-offset-0"
            />
          </div>

          <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs font-semibold bg-slate-50 border-0 focus:ring-1 focus:ring-[#FE5300] focus:ring-offset-0">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="Category">Category</SelectItem>
              <SelectItem value="WebPage">WebPages</SelectItem>
              <SelectItem value="Package">Packages</SelectItem>
              <SelectItem value="Destination">Destinations</SelectItem>
              <SelectItem value="Booking">Bookings</SelectItem>
              <SelectItem value="Visa">Visa</SelectItem>
              <SelectItem value="VisaApplication">Visa Applications</SelectItem>
              <SelectItem value="Blog">Blogs</SelectItem>
              <SelectItem value="News">News</SelectItem>
              <SelectItem value="Vehicle">Vehicle</SelectItem>
              <SelectItem value="Invoice">Invoices</SelectItem>
              <SelectItem value="SalesPerson">Sales Person</SelectItem>
              <SelectItem value="Staff">Staff / Roles</SelectItem>
              <SelectItem value="Author">Authors</SelectItem>
              <SelectItem value="Coupan">Coupons</SelectItem>
              <SelectItem value="Membership">Memberships</SelectItem>
              <SelectItem value="Newsletter">Newsletters</SelectItem>
              <SelectItem value="Media">Gallery</SelectItem>
              <SelectItem value="AboutUs">About Us</SelectItem>
              <SelectItem value="VideoBanner">Video Banners</SelectItem>
              <SelectItem value="Footer">Footer Items</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[120px] h-8 text-xs font-semibold bg-slate-50 border-0 focus:ring-1 focus:ring-[#FE5300] focus:ring-offset-0">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="CREATE">CREATE</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="LOGIN">LOGIN</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            <Loader size="lg" message="Loading audit history..." />
          </div>
        ) : isError ? (
          <div className="h-[200px] flex items-center justify-center text-red-500 font-semibold">
            Failed to load audit logs. Please try again.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-wider pl-4 py-2">Timestamp</TableHead>
                  <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-wider py-2">User</TableHead>
                  <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-wider py-2">Title</TableHead>
                  <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-wider py-2">Module</TableHead>
                  <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-wider py-2">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((log: AuditLog) => (
                  <TableRow 
                    key={log._id}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-all duration-300 ease-in-out group ${selectedLog?._id === log._id ? 'bg-slate-50/80' : ''}`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="pl-4 py-2 whitespace-nowrap text-[11px] text-slate-600 font-medium">
                      {format(new Date(log.createdAt), "MMM d, yyyy • h:mm a")}
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-800">{log.userName}</span>
                        <span className="text-[9px] text-slate-500 font-semibold">{log.role}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 max-w-[250px]">
                      <span className={`text-[13px] font-semibold truncate block transition-transform duration-300 group-hover:translate-x-[1px] ${!log.documentTitle || log.documentTitle === "N/A" ? 'text-slate-400 italic' : 'text-slate-700'}`} title={log.documentTitle}>
                        {log.documentTitle && log.documentTitle !== "N/A" ? log.documentTitle : "NA"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm text-[9px] font-bold tracking-wide uppercase border border-slate-200">
                        {log.moduleName}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider border ${getActionColor(log.actionType)}`}>
                        {getActionIcon(log.actionType)}
                        {log.actionType}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                
                {data?.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-[200px] text-center text-slate-500 font-medium">
                      No audit logs found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {data?.pagination && (
        <div className="flex items-center justify-between px-2 pt-2">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
            Showing page <span className="text-slate-700">{page}</span> of{" "}
            <span className="text-slate-700">{data.pagination.pages}</span>
          </p>
          <Pagination
            currentPage={page}
            totalPages={data.pagination.pages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Side Drawer for Details */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent side="right" className="w-[95vw] sm:max-w-[900px] overflow-y-auto bg-white p-0">
          {selectedLog && (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getActionColor(selectedLog.actionType)}`}>
                  {getActionIcon(selectedLog.actionType)}
                  {selectedLog.actionType}
                </span>
                <SheetTitle className="text-xl font-black text-slate-800 mt-1">
                  {selectedLog.documentTitle && selectedLog.documentTitle !== "N/A" ? selectedLog.documentTitle : selectedLog.description}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 font-medium">
                  {selectedLog.moduleName} • Modified by {selectedLog.userName} on {format(new Date(selectedLog.createdAt), "MMM d, yyyy h:mm a")}
                </SheetDescription>
              </div>

              <div className="p-6 flex-1 space-y-8">
                {/* Changed Fields Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Data Changes
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <StructuredPayloadDisplay changes={selectedLog.changes} />
                  </div>
                </div>

                {/* Metadata Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <ServerCrash className="w-3.5 h-3.5" />
                    System Metadata
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="col-span-1 text-[10px] text-slate-400 font-bold uppercase">IP Address</span>
                      <span className="col-span-2 text-xs text-slate-700 font-mono">{selectedLog.metadata?.ipAddress || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="col-span-1 text-[10px] text-slate-400 font-bold uppercase">User Agent</span>
                      <span className="col-span-2 text-xs text-slate-700 line-clamp-3">{selectedLog.metadata?.userAgent || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="col-span-1 text-[10px] text-slate-400 font-bold uppercase">Trace ID</span>
                      <span className="col-span-2 text-[10px] text-slate-500 font-mono">{selectedLog.metadata?.requestId || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="col-span-1 text-[10px] text-slate-400 font-bold uppercase">Entity ID</span>
                      <span className="col-span-2 text-[10px] text-slate-500 font-mono">{selectedLog.metadata?.entityId || selectedLog.entityId || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
