"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Eye } from "lucide-react";

interface SalesRecord {
  _id: string;
  clientName: string;
  clientPhone: string;
  packageName: string;
  status: string;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface Props {
  records: SalesRecord[];
  isAdmin: boolean;
}

const SalesRecordList: React.FC<Props> = ({ records, isAdmin }) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [createdByFilter, setCreatedByFilter] = useState("All");

  const uniqueCreators = Array.from(new Set(records.map((r) => r.createdBy?._id))).map(id => {
    return records.find(r => r.createdBy?._id === id)?.createdBy;
  }).filter(Boolean);

  const filteredRecords = records.filter((r) => {
    const matchSearch =
      r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.clientPhone.includes(searchTerm) ||
      r.packageName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    const matchCreator = createdByFilter === "All" || r.createdBy?._id === createdByFilter;
    return matchSearch && matchStatus && matchCreator;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients or packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 h-8 text-[13px] bg-slate-50 border-none rounded focus:outline-none focus:ring-1 focus:ring-[#FE5300] transition-all duration-300"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isAdmin && (
            <select
              value={createdByFilter}
              onChange={(e) => setCreatedByFilter(e.target.value)}
              className="w-full sm:w-auto px-4 h-8 text-[13px] bg-slate-50 border-none rounded focus:outline-none focus:ring-1 focus:ring-[#FE5300] transition-all duration-300 cursor-pointer"
            >
              <option value="All">All Creators</option>
              {uniqueCreators.map((creator) => (
                <option key={creator?._id} value={creator?._id}>
                  {creator?.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-4 h-8 text-[13px] bg-slate-50 border-none rounded focus:outline-none focus:ring-1 focus:ring-[#FE5300] transition-all duration-300 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 border-b border-slate-200 tracking-wider font-bold">
            <tr>
              <th className="px-6 py-3">Client</th>
              <th className="px-6 py-3">Package</th>
              {isAdmin && <th className="px-6 py-3">Created By</th>}
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center text-slate-500 text-[13px]">
                  No sales records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record._id} className="hover:bg-slate-50/80 transition-all duration-300 ease-in-out group">
                  <td className="px-6 py-2">
                    <div className="font-semibold text-slate-700 text-[13px] group-hover:translate-x-[1px] transition-transform duration-300 ease-in-out">{record.clientName}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">{record.clientPhone}</div>
                  </td>
                  <td className="px-6 py-2 text-slate-600 text-[13px] font-medium">{record.packageName}</td>
                  {isAdmin && (
                    <td className="px-6 py-2 text-slate-600 text-[13px] font-medium">{record.createdBy?.name || "Unknown"}</td>
                  )}
                  <td className="px-6 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase ${
                        record.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : record.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-2 text-slate-500 text-[11px]">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-2 text-right">
                    <button
                      onClick={() => router.push(`/admin/sales-record/${record._id}`)}
                      className="p-1.5 text-slate-400 hover:text-[#FE5300] hover:bg-orange-50 rounded transition-all duration-300 opacity-60 group-hover:opacity-100 hover:scale-110"
                      title="View Details"
                    >
                      <Eye className="w-[14px] h-[14px]" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesRecordList;
