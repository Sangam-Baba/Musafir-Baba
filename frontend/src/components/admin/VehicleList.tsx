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

interface IVehicleList {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  fuelType: string;
  price: {
    daily: number;
    hourly: number;
  };
  status: string;
}

interface UsersTableProps {
  vehicles: IVehicleList[];
  onStatusChange: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function VehiclesList({
  vehicles,
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
              <TableHead className="w-[30%]">Vehicle Name</TableHead>
              <TableHead className="w-[30%]">Vehicle Type</TableHead>
              <TableHead className="w-[30%]">Fuel Type</TableHead>
              <TableHead className="w-[30%]">Price</TableHead>
              <TableHead className="w-[30%]">Status</TableHead>
              <TableHead className="w-[20%] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((cat: IVehicleList) => (
              <motion.tr
                key={cat._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">{cat.vehicleName}</TableCell>
                <TableCell className="font-medium">{cat.vehicleType}</TableCell>
                <TableCell className="font-medium">{cat.fuelType}</TableCell>
                <TableCell className="font-medium">
                  {cat.price?.daily} / {cat.price?.hourly}
                </TableCell>
                <TableCell
                  className={`font-medium ${
                    cat.status == "published"
                      ? "text-green-600"
                      : "text-red-400"
                  }`}
                >
                  {cat.status}
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
                    variant="default"
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
        {vehicles.map((cat: IVehicleList) => (
          <Card key={cat._id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{cat.vehicleName}</h3>
              <h3 className="font-semibold text-lg">{cat.vehicleType}</h3>
              <h3 className="font-semibold text-lg">{cat.fuelType}</h3>
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
                  variant="default"
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
