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
import { SquareChevronDown } from "lucide-react";
export function AccountIcon() {
  const openDialog = useAuthDialogStore((state) => state.openDialog);
  const auth = useAuthStore();
  const isAuthenticated = auth.isAuthenticated;
  return (
    <div>
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="group flex flex-col items-center cursor-pointer select-none">
              <div className="flex items-center text-md font-semibold gap-1">
                Hi, {auth?.name} <SquareChevronDown size={15} />
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
                  <Link href="/auth/profile">Profile</Link>{" "}
                </DropdownMenuItem>
              )}
              {isAuthenticated && (
                <DropdownMenuItem>
                  <Link href="/auth/bookings">My Bookings</Link>{" "}
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
      ) : (
        <div className="group">
          <p
            className="cursor-pointer font-semibold border-2 border-[#FE5300] px-4 py-1 rounded-md hover:bg-[#FE5300] hover:text-white transition-all duration-300"
            onClick={() => openDialog("login", undefined)}
          >
            Login
          </p>
          {/* <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p> */}
        </div>
      )}
    </div>
  );
}
