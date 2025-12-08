"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar as AppSidebar } from "@/components/admin/app-sidebar";
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
        <SidebarProvider>
          <div className="flex w-full min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            {/* Sidebar */}
            {!isLoginPage && <AppSidebar />}

            <div className="flex flex-col flex-1">
              {!isLoginPage && (
                <header className="flex items-center h-14 px-4 border-b bg-white dark:bg-slate-950">
                  <SidebarTrigger />
                </header>
              )}

              {/* Page Content */}
              <main className="flex-1  p-6">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      </AdminProtected>
    </RootProvider>
  );
}
