"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar as AppSidebar } from "@/components/admin/app-sidebar";
import { RootProvider } from "@/providers/root-provider";
import AdminProtected from "@/components/admin/AdminProtected";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";

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
          <div className="flex w-full min-h-screen bg-gray-50 text-slate-900">
            {/* Sidebar */}
            {!isLoginPage && <AppSidebar />}

            <div className="flex flex-col flex-1">
              {!isLoginPage && (
                <header className="flex items-center h-14 px-4 border-b bg-white">
                  <SidebarTrigger />
                  <Link
                    href="/admin/logout"
                    className="flex gap-2 hover:text-red-600"
                  >
                    Logout
                    <LogOut />
                  </Link>
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
