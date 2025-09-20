"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
interface User{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean
}
interface UsersTableProps {
  users: User[];
  onStatusChange: (id: string, role: string) => void;
  onDelete: (id: string) => void;
}

export default function UsersList({ users , onStatusChange, onDelete }: UsersTableProps ) {

  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="rounded-2xl shadow-md overflow-hidden">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[25%]">Name</TableHead>
              <TableHead className="w-[25%]">E-mail</TableHead>
              <TableHead className="w-[25%]">Role</TableHead>
              <TableHead className="w-[25%] text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((cat: User) => (
              <motion.tr
                key={cat.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">{cat.name}</TableCell>       
                <TableCell className="font-medium">{cat.email}</TableCell>           
                <TableCell className="font-medium">
                  <select
                    value={cat.role}
                    onChange={(e) => onStatusChange(cat.id, e.target.value)}
                    className="border border-blue-600 p-1 rounded-md  text-blue-600 hover:bg-blue-600 hover:text-white inline-flex items-center gap-1"
                  >
                    <option value="">{cat.role.charAt(0).toUpperCase() + cat.role.slice(1)}</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </TableCell>  
                <TableCell className="text-right space-x-2">
                  <Button
                    variant={cat.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => onDelete(cat.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> {cat.isActive ? "Block" : "Unblock"}
                  </Button>
               </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {users.map((cat: User) => (
          <Card key={cat.id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{cat.name}</h3>  
              <h3 className="font-semibold text-lg">{cat.email}</h3>            
              <div className="flex gap-2 pt-2">
                <select
                  value={cat.role}
                  onChange={(e) => onStatusChange(cat.id, e.target.value)}
                  className=" w-1/2 border border-blue-600 p-1 rounded-md  text-blue-600 hover:bg-blue-600 hover:text-white inline-flex items-center gap-1"              
                >
                  <option  value="">{cat.role}</option>
                  <option  value="user">User</option>
                  <option  value="admin">Admin</option>
                </select>
                <Button
                  variant={cat.isActive ? "destructive" : "default"}
                  size="sm"
                  className="flex-1 w-1/2"
                  onClick={() => onDelete(cat.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> {cat.isActive ? "Block" : "Unblock"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
