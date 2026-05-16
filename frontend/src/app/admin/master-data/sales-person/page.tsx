"use client";

import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";

interface SalesPerson {
  _id: string;
  name: string;
  salesId: string;
  isActive: boolean;
}

export default function SalesPersonPage() {
  const [data, setData] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = useAdminAuthStore((s) => s.accessToken);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/sales-person`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      toast.error("Failed to fetch sales persons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingId 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/sales-person/${editingId}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/sales-person`;
      
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(editingId ? "Updated successfully" : "Created successfully");
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: "" });
        fetchData();
      } else {
        toast.error(json.message);
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/sales-person/${deletingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Deleted successfully");
        setIsDeleteModalOpen(false);
        setDeletingId(null);
        fetchData();
      } else {
        toast.error(json.message || "Failed to delete");
      }
    } catch (err) {
      toast.error("Failed to delete");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.salesId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center text-[#FE5300]">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-none">Sales Persons</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Team & ID Management
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "" });
            setIsModalOpen(true);
          }}
          className="h-8 flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg transition-all shadow-sm text-xs font-bold"
        >
          <Plus size={14} />
          Add Sales Person
        </button>
      </div>

      {/* Search & Stats */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search by name or Sales ID..."
            className="w-full pl-8 pr-4 h-8 bg-slate-50 border-none rounded-lg focus:ring-1 focus:ring-orange-500 outline-none text-xs transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
          Total: {filteredData.length} persons
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-32">Sales ID</th>
              <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</th>
              <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={3} className="px-4 py-3 h-12 bg-slate-50/30"></td>
                </tr>
              ))
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-slate-400 text-xs italic">
                  No sales persons found.
                </td>
              </tr>
            ) : (
              filteredData.map((person) => (
                <tr key={person._id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2 text-[13px] font-bold text-orange-600 font-mono tracking-tight">
                    {person.salesId}
                  </td>
                  <td className="px-4 py-2 group-hover:translate-x-0.5 transition-transform duration-300">
                    <span className="text-[13px] font-semibold text-slate-700">{person.name}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditingId(person._id);
                          setFormData({ name: person.name });
                          setIsModalOpen(true);
                        }}
                        className="h-7 w-7 flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingId(person._id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="h-7 w-7 flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="p-5 border-b bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Sales Person" : "Add New Sales Person"}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none text-sm transition-all"
                  placeholder="Enter name..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[320px] overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Confirm Delete</h3>
              <p className="text-slate-500 text-[13px] mb-5 leading-relaxed">
                This will permanently remove the sales person. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
