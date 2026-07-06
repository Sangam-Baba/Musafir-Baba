import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { ChevronDown, User } from "lucide-react";
export function AccountIcon() {
  const openDialog = useAuthDialogStore((state) => state.openDialog);
  const auth = useAuthStore();
  const isAuthenticated = auth.isAuthenticated;
  return (
    <div>
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-all cursor-pointer select-none border border-white/20 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                <User size={14} className="text-[#FE5300]" />
              </div>
              <div className="flex items-center text-sm font-bold gap-1 text-white drop-shadow-sm">
                Hi, {auth?.name?.split(" ")[0]}
                <ChevronDown size={14} className="opacity-80 mt-[1px]" />
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuGroup>
              {isAuthenticated && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/user" className="w-full">Dashboard</Link>
                </DropdownMenuItem>
              )}
              {isAuthenticated && (
                <DropdownMenuItem asChild className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Link href="/auth/logout" className="w-full">Logout</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="group">
          <Button
            className="h-8 w-28 bg-[#FE5300] border-2 border-[#FE5300] text-white hover:bg-white hover:text-[#FE5300] rounded-md font-bold shadow-sm transition-all"
            onClick={() => openDialog("login", undefined)}
          >
            Login
          </Button>
        </div>
      )}
    </div>
  );
}
