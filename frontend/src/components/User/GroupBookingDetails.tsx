"use client";
import type { GroupBooking } from "@/app/admin/bookings/page";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  X,
  Calendar,
  Users,
  CreditCard,
  Package,
  User,
  UsersRound,
} from "lucide-react";
import { Button } from "../ui/button";
import { getStatusColor } from "@/app/admin/bookings/page";
import { formatDate } from "@/app/admin/bookings/page";

function GroupBookingDetails({
  group,
  onClose,
}: {
  group: GroupBooking;
  onClose: () => void;
}) {
  const totalTravellers =
    group.travellers.quad +
    group.travellers.triple +
    group.travellers.double +
    group.travellers.child;

  return (
    <div className="w-full mx-auto  max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <Card className="border-none shadow-lg">
        {/* Header */}
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-2xl font-bold text-pretty">
                  {group.packageId?.title || "Booking Details"}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {totalTravellers}{" "}
                  {totalTravellers === 1 ? "Traveller" : "Travellers"}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <Separator />

        {/* Content */}
        <CardContent className="space-y-6 pt-6 pb-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Batch Details Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Batch Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {formatDate(group.batchId?.startDate)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={getStatusColor(group.batchId?.status || "")}
                >
                  {group.batchId?.status || "N/A"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Travellers Details Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Traveller Breakdown</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-card p-4 text-center space-y-2">
                <User className="h-5 w-5 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {group.travellers.quad || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Quad</p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-2">
                <User className="h-5 w-5 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {group.travellers.triple || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Triple</p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-2">
                <User className="h-5 w-5 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {group.travellers.double || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Double</p>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-2">
                <User className="h-5 w-5 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {group.travellers.child || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Child</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
              <p className="text-sm text-muted-foreground">Total Travellers</p>
              <p className="text-3xl font-bold text-primary">
                {totalTravellers}
              </p>
            </div>
          </div>

          <Separator />

          {/* Payment Details Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Payment Information</h3>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Payment Method
                  </p>
                  <p className="font-medium capitalize">
                    {group.paymentMethod || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Payment Status
                  </p>
                  <Badge
                    variant="outline"
                    className={getStatusColor(group.paymentInfo?.status)}
                  >
                    {group.paymentInfo?.status || "N/A"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.paymentInfo?.orderId && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Transaction ID
                    </p>
                    <p className="font-mono text-sm font-medium break-all">
                      {group.paymentInfo.orderId}
                    </p>
                  </div>
                )}
                {group.totalPrice && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Total Amount
                    </p>
                    <p className="font-mono text-sm font-medium break-all">
                      ₹{group.totalPrice.toLocaleString("en-IN")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GroupBookingDetails;
