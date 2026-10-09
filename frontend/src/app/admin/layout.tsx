"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React from "react";
import { Toaster } from "sonner";
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

            {/* min-w-0 lets this flex child shrink below its content width,
                so wide tables scroll inside their own container instead of
                stretching the whole page. */}
            <div className="flex flex-col flex-1 min-w-0">
              {!isLoginPage && (
                <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/70">
                  <SidebarTrigger className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-900" />
                  <Link
                    href="/admin/logout"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </Link>
                </header>
              )}
              {/* Page Content */}
              <main className="flex-1  p-6">{children}</main>
              <Toaster position="top-right" richColors />
            </div>
          </div>
        </SidebarProvider>
      </AdminProtected>
    </RootProvider>
  );
}
