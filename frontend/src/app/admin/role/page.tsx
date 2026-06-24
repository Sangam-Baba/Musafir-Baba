"use client";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import UsersList from "@/components/admin/UsersList";
import CreateEditStaff from "@/components/auth/CreateEditStaff";
import { Button } from "@/components/ui/button";
export interface ListUserInterface {
  _id: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  avatar?: {
    url: string;
    public_id: string;
    alt: string;
  };
  loginInfo?: {
    lastLoginAt: string;
    lastLogoutAt: string;
    device: {
      browser: string;
      os: string;
      device: string;
    };
    ip: string;
    multipleDevices: boolean;
    currentStatus: string;
  };
  onlineStatus?: string;
  isActive: boolean;
  attendanceEligible?: boolean;
  totalLeaveBalance?: number;
  availableLeaveBalance?: number;
  totalShortLeaveBalance?: number;
  availableShortLeaveBalance?: number;
}

interface QueryResponse {
  success: boolean;
  message: string;
  data: ListUserInterface[];
}
const getAllUsers = async (
  email: string,
  accessToken: string,
  role: string
) => {
  let res;
  if (role === "admin") {
    res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/admin/?email=${email}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } else {
    res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/getAllUsers/?email=${email}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }
  if (!res.ok) throw new Error("Failed to fetch users", { cause: res });
  const data = await res.json();
  return data;
};
function UsersPage() {
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchRole, setSearchRole] = useState("admin");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];

  const { data, isLoading, isError, error, refetch } = useQuery<QueryResponse>({
    queryKey: ["users", searchEmail, searchRole],
    queryFn: () => getAllUsers(searchEmail, accessToken, searchRole),
    retry: 2,
    enabled: permissions.includes("role"),
  });
  if (isError) {
    toast.error(error.message);
    return <h1>{error.message}</h1>;
  }
  const users = data?.data ?? [];

  const filtered = users.filter(
    (user) => user.email !== "admin@musafirbaba.com"
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      let res;
      if (searchRole === "admin") {
        res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } else {
        res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
      if (!res.ok) throw new Error(`Failed to delete ${searchRole} `);
      toast.success("User: Deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error) {
      console.log("error in deleting", error);
      toast.error("Something went wrong while deleting");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const endpoint = searchRole === "admin" ? "admin" : "auth";
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/${endpoint}/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(currentStatus ? "Account marked as inactive" : "Account marked as active");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error) {
      toast.error("Something went wrong while updating status");
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };
  const handleSearch = () => {
    setSearchEmail(email);
    refetch();
  };
  if (!permissions.includes("role"))
    return <div className="mx-auto text-2xl">Access Denied</div>;
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-[18px] font-bold text-slate-800">
          All {searchRole === "admin" ? "Staff" : "Users"}
        </h1>
        <div className="flex gap-3 items-center">
          <select
            className="h-8 bg-slate-50 border-0 focus:ring-1 focus:ring-[#FE5300] focus:outline-none rounded px-3 text-[13px] text-slate-700 transition-shadow duration-300"
            value={searchRole}
            onChange={(e) => setSearchRole(e.target.value)}
          >
            <option value="admin">Staff</option>
            <option value="user">User</option>
          </select>
          <input
            type="text"
            placeholder="user@gmail.com"
            className="h-8 bg-slate-50 border-0 focus:ring-1 focus:ring-[#FE5300] focus:outline-none rounded px-3 text-[13px] text-slate-700 transition-shadow duration-300"
            value={email}
            onChange={handleChange}
          />
          <button
            onClick={handleSearch}
            className="h-8 bg-[#FE5300] text-white px-4 rounded text-[13px] font-medium shadow-sm hover:bg-[#e04a00] transition-colors duration-300"
          >
            Search
          </button>
          <Button onClick={() => setIsOpen(true)} className="h-8 bg-slate-800 hover:bg-slate-700 text-white px-4 rounded text-[13px] font-medium">
            +Add Staff
          </Button>
          {isOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <CreateEditStaff
                onClose={() => {
                  setEditId(null);
                  setIsOpen(false);
                }}
                id={editId}
                role={searchRole as "admin" | "user"}
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <UsersList
          users={filtered.map((b) => ({
            _id: b._id,
            name: b.name,
            designation: b.designation,
            email: b.email,
            role: b.role,
            loginInfo: b.loginInfo,
            onlineStatus:
              b.loginInfo?.currentStatus === "Online" ? "Online" : "Offline",
            isActive: b.isActive ?? true,
            attendanceEligible: b.attendanceEligible,
            totalLeaveBalance: b.totalLeaveBalance,
            availableLeaveBalance: b.availableLeaveBalance,
            totalShortLeaveBalance: b.totalShortLeaveBalance,
            availableShortLeaveBalance: b.availableShortLeaveBalance,
          }))}
          onStatusChange={(id) => {
            setEditId(id);
            setIsOpen(true);
          }}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default UsersPage;
