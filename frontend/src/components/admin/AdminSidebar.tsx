import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";
import { Home, Users, Box, Settings, X } from "lucide-react";

const NAV = [
{ label: "Dashboard", href: "/admin", icon: Home },
{ label: "Packages", href: "/admin/packages", icon: Box },
{ label: "Destinations", href: "/admin/destinations", icon: Box },
{ label: "Users", href: "/admin/users", icon: Users },
{ label: "Settings", href: "/admin/settings", icon: Settings },
];

function cx(...parts: Array<string | false | null | undefined>) {
return parts.filter(Boolean).join(" ");
}

export function AdminSidebar() {
const sidebarOpen = useUIStore((s) => s.sidebarOpen);
const closeSidebar = useUIStore((s) => s.closeSidebar);
const pathname = usePathname();

useEffect(() => {
closeSidebar();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [pathname]);

return (
<>
{/* Sidebar for md+ */}
<aside className="hidden md:flex md:w-64 md:flex-col md:h-screen md:border-r bg-white dark:bg-slate-950 p-4">
<nav className="flex flex-col gap-1 mt-2">
{NAV.map((item) => {
const Icon = item.icon;
const active = pathname === item.href;
return (
<Link
key={item.href}
href={item.href}
className={cx(
"flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition",
active ? "bg-gray-100 dark:bg-slate-800 font-medium" : ""
)}
>
<Icon />
<span>{item.label}</span>
</Link>
);
})}
<div className="mt-4 border-t pt-3">
<button
className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800"
onClick={() => {
console.log("open role management");
}}
>
<Settings /> <span>Role Management</span>
</button>
</div>
</nav>
<div className="mt-auto text-xs text-gray-500">
<div>© {new Date().getFullYear()} Your Company</div>
</div>

</aside>

{/* Mobile off-canvas sidebar */}
<div
className={cx(
"fixed inset-0 z-40 md:hidden transition-opacity",
sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
)}
aria-hidden={!sidebarOpen}
>
{/* overlay */}
<div
className={cx(
"absolute inset-0 bg-black/40",
sidebarOpen ? "opacity-100" : "opacity-0"
)}
onClick={closeSidebar}
/>


<aside
className={cx(
"absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-950 p-4 shadow-xl transform transition-transform",
sidebarOpen ? "translate-x-0" : "-translate-x-full"
)}
>
<div className="flex items-center justify-between">
<div className="font-semibold text-lg">Admin</div>
<button onClick={closeSidebar} aria-label="Close sidebar" className="p-2 rounded-md">
<X />
</button>
</div>


<nav className="flex flex-col gap-1 mt-4">
{NAV.map((item) => {
const Icon = item.icon;
const active = pathname === item.href;
return (
<Link
key={item.href}
href={item.href}
className={cx(
"flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition",
active ? "bg-gray-100 dark:bg-slate-800 font-medium" : ""
)}
>
<Icon />
<span>{item.label}</span>
</Link>
);
})}
</nav>


<div className="mt-auto text-xs text-gray-500">© {new Date().getFullYear()} Your Company</div>
</aside>
</div>
</>
)}
