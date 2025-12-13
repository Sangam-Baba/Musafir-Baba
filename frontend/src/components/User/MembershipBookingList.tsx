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
import { Edit, Trash2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
interface Author {
  _id: string;
  name: string;
  duration: string;
  amount: string;
  startDate: string;
  endDate: string;
  membershipStatus: string;
  transactionStatus: string;
  transactionId: string;
}
interface BookingsTableProps {
  bookings: Author[];
}

export default function MembershipBookingList({
  bookings,
}: BookingsTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="rounded-2xl shadow-md overflow-hidden">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[12%]">Name</TableHead>
              <TableHead className="w-[12%]">Duration</TableHead>
              <TableHead className="w-[12%]">Amount</TableHead>
              <TableHead className="w-[12%]">Start Date</TableHead>
              <TableHead className="w-[12%]">End Date</TableHead>
              <TableHead className="w-[12%]">Membership Status</TableHead>
              <TableHead className="w-[12%]">Transaction Status</TableHead>
              <TableHead className="w-[12%]">Transaction Id</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((cat: Author) => (
              <motion.tr
                key={cat._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="font-medium">{cat.duration}</TableCell>
                <TableCell className="font-medium">{cat.amount}</TableCell>
                <TableCell className="font-medium">{cat.startDate}</TableCell>
                <TableCell className="font-medium">{cat.endDate}</TableCell>
                <TableCell className="font-medium">
                  {cat.membershipStatus}
                </TableCell>
                <TableCell className="font-medium">
                  {cat.transactionStatus}
                </TableCell>
                <TableCell className="font-medium">
                  {cat.transactionId}
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {bookings.map((cat: Author) => (
          <Card key={cat._id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{cat.name}</h3>
              <h3 className="font-semibold text-lg">{cat.duration}</h3>
              <h3 className="font-semibold text-lg">{cat.amount}</h3>
              <h3 className="font-semibold text-lg">{cat.startDate}</h3>
              <h3 className="font-semibold text-lg">{cat.endDate}</h3>
              <h3 className="font-semibold text-lg">{cat.membershipStatus}</h3>
              <h3 className="font-semibold text-lg">{cat.transactionStatus}</h3>
              <h3 className="font-semibold text-lg">{cat.transactionId}</h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
