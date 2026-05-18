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
import { Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { ListUserInterface } from "@/app/admin/role/page";

interface UsersTableProps {
  users: ListUserInterface[];
  onStatusChange: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function UsersList({
  users,
  onStatusChange,
  onDelete,
}: UsersTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="rounded-2xl shadow-md overflow-hidden">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[20%]">Name</TableHead>
              <TableHead className="w-[20%]">Designation</TableHead>
              <TableHead className="w-[20%]">E-mail</TableHead>
              <TableHead className="w-[20%]">Last Login</TableHead>
              <TableHead className="w-[20%]">Device</TableHead>
              <TableHead className="w-[20%]">Status</TableHead>
              <TableHead className="w-[20%] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((cat: ListUserInterface) => (
              <motion.tr
                key={cat._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="font-medium text-slate-500">{cat.designation ?? "N/A"}</TableCell>
                <TableCell className="font-medium">{cat.email}</TableCell>
                <TableCell className="font-medium">
                  {new Date(cat?.loginInfo?.lastLoginAt ?? "").toLocaleString(
                    "en-IN",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {cat.loginInfo?.device?.device ?? "Not Found"}
                </TableCell>
                <TableCell
                  className={`font-medium ${
                    cat.isActive == "Online" ? "text-green-600" : "text-red-400"
                  }`}
                >
                  {cat.isActive}
                </TableCell>
                <TableCell className="font-medium">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onStatusChange(cat._id)}
                  >
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant={cat.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => onDelete(cat._id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                  </Button>
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
              <div className="flex gap-2 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 w-1/2"
                  onClick={() => onStatusChange(cat._id)}
                >
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button
                  variant={cat.isActive ? "destructive" : "default"}
                  size="sm"
                  className="flex-1 w-1/2"
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
