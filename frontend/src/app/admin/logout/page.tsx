"use client";

import { Suspense } from "react";
import LogoutAdminClient from "@/components/auth/LogoutAdmin";

export default function LogoutAdmin() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <LogoutAdminClient />
    </Suspense>
  );
}
