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
              <TableHead className="w-[30%]">Name</TableHead>
              <TableHead className="w-[30%]">E-mail</TableHead>
              <TableHead className="w-[30%]">Last Login</TableHead>
              <TableHead className="w-[30%]">Device</TableHead>
              <TableHead className="w-[30%]">Status</TableHead>
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
                <TableCell className="font-medium">{cat.email}</TableCell>
                <TableCell className="font-medium">
                  {new Date(
                    cat?.loginInfo?.lastLoginAt ?? ""
                  ).toLocaleTimeString()}
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
                    <Trash2 className="w-4 h-4 mr-1" />{" "}
                    {cat.isActive ? "Delete" : "Unblock"}
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
              <h3 className="font-semibold text-lg">{cat.name}</h3>
              <h3 className="font-semibold text-lg">{cat.email}</h3>
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
                  <Trash2 className="w-4 h-4 mr-1" />{" "}
                  {cat.isActive ? "Delete" : "Unblock"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
