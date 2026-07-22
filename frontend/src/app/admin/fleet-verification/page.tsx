import React from "react";
import FleetVerificationClient from "@/components/admin/fleet-verification/FleetVerificationClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fleet Verification | MusafirBaba Admin",
  description: "Verify Fleet Partners, Vehicles, and Documents",
};

export default function FleetVerificationPage() {
  return (
    <div className="flex-1 w-full bg-slate-50 min-h-screen">
      <FleetVerificationClient />
    </div>
  );
}
