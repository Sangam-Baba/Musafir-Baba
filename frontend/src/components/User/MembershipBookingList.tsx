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
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Booking {
  _id: string;
  name: string;
  duration: string;
  amount: number;
  startDate: string;
  endDate: string;
  membershipStatus: string;
  transactionStatus: string;
  transactionId: string;
}

interface BookingsTableProps {
  bookings: Booking[];
}

export default function MembershipBookingList({
  bookings,
}: BookingsTableProps) {
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "active") {
      return (
        <Badge className="bg-chart-3 text-white hover:bg-chart-3/90">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
    if (statusLower === "expired") {
      return (
        <Badge variant="secondary">
          <XCircle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getPaymentBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "completed") {
      return (
        <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }
    if (statusLower === "pending") {
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Pending
        </Badge>
      );
    }
    if (statusLower === "failed") {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden lg:block">
        <Card className="border-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold">Plan Name</TableHead>
                <TableHead className="font-bold">Duration</TableHead>
                <TableHead className="font-bold">Amount</TableHead>
                <TableHead className="font-bold">Start Date</TableHead>
                <TableHead className="font-bold">End Date</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Payment</TableHead>
                <TableHead className="font-bold">Transaction ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking: Booking, index: number) => (
                <motion.tr
                  key={booking._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-semibold">
                    {booking.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{booking.duration}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ₹{booking.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(booking.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(booking.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(booking.membershipStatus)}
                  </TableCell>
                  <TableCell>
                    {getPaymentBadge(booking.transactionStatus)}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {booking.transactionId}
                    </code>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {bookings.map((booking: Booking, index: number) => (
          <motion.div
            key={booking._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-2">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{booking.name}</h3>
                    <Badge variant="secondary" className="mt-1">
                      {booking.duration}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      ₹{booking.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Start:
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(booking.startDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">End:</span>
                    <span className="text-sm font-medium">
                      {new Date(booking.endDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Membership Status
                      </p>
                      {getStatusBadge(booking.membershipStatus)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Payment Status
                      </p>
                      {getPaymentBadge(booking.transactionStatus)}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">
                      Transaction ID
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      {booking.transactionId}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
