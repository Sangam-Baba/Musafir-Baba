import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleUserRound } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
export function AccountIcon() {
  const openDialog = useAuthDialogStore((state) => state.openDialog);
  const auth = useAuthStore();
  const isAuthenticated = auth.isAuthenticated;
  return (
    <div>
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <CircleUserRound />
            </Button>
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
            className="cursor-pointer font-semibold"
            onClick={() => openDialog("login", undefined)}
          >
            Login
          </p>
          <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
        </div>
      )}
    </div>
  );
}
