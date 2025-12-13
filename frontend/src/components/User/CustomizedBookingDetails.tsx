"use client";
import type {
  CustomizedBooking,
  GroupBooking,
} from "@/app/admin/bookings/page";
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

function CustomizedBookingDetails({
  customized,
  onClose,
}: {
  customized: CustomizedBooking;
  onClose: () => void;
}) {
  const totalTravellers = customized.noOfPeople || 0;
  console.log("customized", customized);

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
                  {customized.packageId?.title || "Booking Details"}
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
              <h3 className="font-semibold text-lg">Plan Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {formatDate(customized.date || "")}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={getStatusColor(customized.bookingStatus || "")}
                >
                  {customized.bookingStatus || "N/A"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

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
                    {customized.paymentMethod || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Payment Status
                  </p>
                  <Badge
                    variant="outline"
                    className={getStatusColor(customized.paymentInfo?.status)}
                  >
                    {customized.paymentInfo?.status || "N/A"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customized.paymentInfo?.orderId && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Transaction ID
                    </p>
                    <p className="font-mono text-sm font-medium break-all">
                      {customized.paymentInfo.orderId}
                    </p>
                  </div>
                )}
                {customized.totalPrice && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Total Amount
                    </p>
                    <p className="font-mono text-sm font-medium break-all">
                      ₹{customized.totalPrice.toLocaleString("en-IN")}
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

export default CustomizedBookingDetails;
