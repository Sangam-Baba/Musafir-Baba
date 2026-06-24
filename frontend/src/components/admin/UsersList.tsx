"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { ListUserInterface } from "@/app/admin/role/page";
import { useState } from "react";
import LeaveConfigModal from "./LeaveConfigModal";

interface UsersTableProps {
  users: ListUserInterface[];
  onStatusChange: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
}

export default function UsersList({
  users,
  onStatusChange,
  onToggleActive,
  onDelete,
}: UsersTableProps) {
  const [configUser, setConfigUser] = useState<ListUserInterface | null>(null);

  return (
    <div className="w-full">
      {configUser && (
        <LeaveConfigModal
          user={configUser}
          onClose={() => setConfigUser(null)}
          onSuccess={() => window.location.reload()} // Quick way to refresh data
        />
      )}
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="rounded-2xl shadow-md overflow-hidden">
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-100">
              <TableHead className="w-[15%] text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Name</TableHead>
              <TableHead className="w-[15%] text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Designation</TableHead>
              <TableHead className="w-[20%] text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">E-mail</TableHead>
              <TableHead className="w-[15%] text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Last Login</TableHead>
              <TableHead className="w-[10%] text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Device</TableHead>
              <TableHead className="w-[10%] text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Status</TableHead>
              <TableHead className="w-[10%] text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Account</TableHead>
              <TableHead className="w-[10%] text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((cat: ListUserInterface) => (
              <motion.tr
                key={cat._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors duration-300 group"
              >
                <TableCell className="py-2">
                  <div className="text-[13px] font-semibold text-slate-700 tracking-tight group-hover:translate-x-[1px] transition-transform duration-300">
                    {cat.name}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-[11px] font-medium text-slate-500 capitalize">
                    {cat.designation ?? "N/A"}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-[10px] font-medium text-slate-400 lowercase font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {cat.email}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-[11px] font-medium text-slate-500">
                    {new Date(cat?.loginInfo?.lastLoginAt ?? "").toLocaleString(
                      "en-IN",
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-[11px] font-medium text-slate-500">
                    {cat.loginInfo?.device?.device ?? "Not Found"}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      cat.onlineStatus === "Online" ? "text-green-500" : "text-slate-400"
                    }`}
                  >
                    {cat.onlineStatus}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 px-2 rounded-sm text-[9px] font-black uppercase tracking-widest ${
                      cat.isActive
                        ? "bg-green-50 text-green-600 hover:bg-green-100"
                        : "bg-red-50 text-red-500 hover:bg-red-100"
                    }`}
                    onClick={() => onToggleActive(cat._id, cat.isActive)}
                  >
                    {cat.isActive ? "Active" : "Inactive"}
                  </Button>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      title="Leave Config"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-blue-500 hover:bg-blue-50 opacity-40 group-hover:opacity-100 hover:scale-110 transition-all duration-300"
                      onClick={() => setConfigUser(cat)}
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      title="Edit Profile"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-[#FE5300] hover:bg-orange-50 opacity-40 group-hover:opacity-100 hover:scale-110 transition-all duration-300"
                      onClick={() => onStatusChange(cat._id)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      title="Delete User"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-40 group-hover:opacity-100 hover:scale-110 transition-all duration-300"
                      onClick={() => onDelete(cat._id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {users.map((cat: ListUserInterface) => (
          <Card key={cat._id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg">{cat.name}</h3>
                {cat.designation && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {cat.designation}
                  </span>
                )}
              </div>
              <h3 className="text-sm text-slate-500">{cat.email}</h3>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 w-[48%]"
                  onClick={() => setConfigUser(cat)}
                >
                  <Settings className="w-4 h-4 mr-1" /> Config
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 w-[48%]"
                  onClick={() => onStatusChange(cat._id)}
                >
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button
                  variant={cat.isActive ? "default" : "secondary"}
                  size="sm"
                  className={`flex-1 w-[48%] ${cat.isActive ? "bg-green-600" : "text-red-600 bg-red-50"}`}
                  onClick={() => onToggleActive(cat._id, cat.isActive)}
                >
                  {cat.isActive ? "Active" : "Inactive"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 w-[48%]"
                  onClick={() => onDelete(cat._id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
