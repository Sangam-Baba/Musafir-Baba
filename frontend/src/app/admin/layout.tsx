"use client";

import React from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RootProvider } from "@/providers/root-provider";
import AdminProtected from "@/components/admin/AdminProtected";
import { usePathname } from "next/navigation";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  return (
    <RootProvider>
      <AdminProtected>
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          <div className="flex h-screen">
            {!isLoginPage && <AdminSidebar />}

            <div className="flex-1 flex flex-col">
              <AdminHeader />

              <main className="p-6 overflow-y-auto">{children}</main>
            </div>
          </div>
        </div>
      </AdminProtected>
    </RootProvider>
  );
}
