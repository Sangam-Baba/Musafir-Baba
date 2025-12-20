import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { ChevronDown } from "lucide-react";
export function SettingDropdown() {
  const auth = useAuthStore();
  const isAuthenticated = auth.isAuthenticated;
  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="group flex flex-col items-center cursor-pointer select-none">
            <div className="flex items-center text-md font-semibold gap-1 whitespace-nowrap mr-2">
              Hi, {auth?.name?.split(" ")[0]} <ChevronDown size={15} />
            </div>

            <p
              className="rounded-xl h-0.5 bg-[#FE5300] w-full opacity-0 
       group-hover:opacity-100 transition-all duration-300"
            ></p>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuGroup>
            {isAuthenticated && (
              <DropdownMenuItem>
                <Link href="/user/settings">Setting</Link>{" "}
              </DropdownMenuItem>
            )}
            {isAuthenticated && (
              <DropdownMenuItem>
                <Link href="/auth/logout">Logout</Link>{" "}
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
