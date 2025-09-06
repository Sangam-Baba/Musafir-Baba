"use client";


import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
Menu,
X,
Sun,
Moon,
LogOut,
} from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useAuthStore } from "@/store/useAuthStore";


// Small helper for conditional classes
function cx(...parts: Array<string | false | null | undefined>) {
return parts.filter(Boolean).join(" ");
}


// -----------------------------
// DarkModeToggle
// -----------------------------
export function DarkModeToggle({ className }: { className?: string }) {
    const logout=useAuthStore((s)=> s.logout)
const { theme, setTheme, resolvedTheme } = useTheme();
const [mounted, setMounted] = useState(false);


useEffect(() => setMounted(true), []);
if (!mounted) return <button aria-hidden className={cx("w-10 h-10 rounded-md border p-2", className)} />;


const isDark = resolvedTheme === "dark";
return (
<button
aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
title={`Switch to ${isDark ? "light" : "dark"} mode`}
onClick={() => setTheme(isDark ? "light" : "dark")}

className={cx(
"w-10 h-10 flex items-center justify-center rounded-md border hover:shadow-sm transition",
className
)}
>
{isDark ? <Sun size={16} /> : <Moon size={16} />}
</button>
);
}


// -----------------------------
// AdminHeader
// -----------------------------
export function AdminHeader() {
const toggleSidebar = useUIStore((s) => s.toggleSidebar);
const closeSidebar = useUIStore((s) => s.closeSidebar);


return (
<header className="h-14 flex items-center justify-between px-4 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
<div className="flex items-center gap-3">
{/* Mobile menu button */}
<button
aria-label="Toggle sidebar"
onClick={toggleSidebar}
className="p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition md:hidden"
>
<Menu />
</button>


<Link href="/admin" className="flex items-center gap-2">
<span className="font-semibold text-lg">Admin</span>
</Link>

<div className="hidden md:block">
<input
placeholder="Search packages, users..."
className="w-[420px] max-w-xs px-3 py-1.5 rounded-md border focus:outline-none focus:ring-1"
aria-label="Search"
/>
</div>
</div>


<div className="flex items-center gap-3">
<DarkModeToggle />


<div className="hidden sm:flex items-center gap-3">


<button
aria-label="Logout"
title="Logout"
className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition"
onClick={() => { 
    console.log("logout clicked");
}}
>
<LogOut />
</button>
</div>


{/* small-screen logout avatar button */}
<div className="sm:hidden">
<button
onClick={closeSidebar}
aria-label="Close"
className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition"
>
<X />
</button>
</div>
</div>
</header>
);
}