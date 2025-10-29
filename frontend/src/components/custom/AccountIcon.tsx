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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <CircleUserRound />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          {!isAuthenticated && (
            <DropdownMenuItem>
              <p onClick={() => openDialog("login", undefined)}>Login</p>
            </DropdownMenuItem>
          )}
          {!isAuthenticated && (
            <DropdownMenuItem>
              <p onClick={() => openDialog("register", undefined)}>Register</p>
            </DropdownMenuItem>
          )}
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
  );
}
